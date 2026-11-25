/**
 * A small JSON Schema (draft-07) validator, enough for the three schemas we check against
 * (Claude Code plugin manifest, Claude Code marketplace, MCP Registry server.json).
 * No dependencies, so the repo needs no new packages for this. It supports: $ref (local
 * "#/..." pointers), type, enum, const, required, properties, patternProperties,
 * additionalProperties, propertyNames, dependencies, items, minItems/maxItems, uniqueItems,
 * minLength/maxLength, pattern, minimum/maximum (and exclusive), anyOf/oneOf/allOf/not and
 * if/then/else. `format` is not checked. An unknown keyword is ignored, which can only make
 * the check more lenient, never reject valid input.
 *
 * validate(schema, value) -> string[] of problems, each "path: what is wrong". Empty = valid.
 */

const typeOf = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v);

const typeMatches = (t, v) => {
  const actual = typeOf(v);
  if (t === actual) return true;
  return t === "number" && actual === "integer";
};

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function resolveRef(root, ref) {
  if (!ref.startsWith("#")) throw new Error(`Only local $ref values are supported, got "${ref}".`);
  let node = root;
  for (const part of ref.slice(1).split("/").filter(Boolean)) {
    node = node?.[decodeURIComponent(part).replace(/~1/g, "/").replace(/~0/g, "~")];
    if (node === undefined) throw new Error(`$ref "${ref}" does not resolve in the schema.`);
  }
  return node;
}

export function validate(rootSchema, value) {
  const problems = [];

  /** Returns the problems for `value` against `schema` without recording them (used by anyOf/oneOf/not/if). */
  const test = (schema, v, path) => {
    const out = [];
    check(schema, v, path, out);
    return out;
  };

  function check(schema, v, path, out) {
    if (schema === true || schema === undefined) return;
    if (schema === false) return void out.push(`${path || "(root)"}: no value is allowed here.`);
    if (schema.$ref) {
      check(resolveRef(rootSchema, schema.$ref), v, path, out);
      // draft-07: siblings of $ref are ignored
      return;
    }
    const at = path || "(root)";

    if (schema.type !== undefined) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      if (!types.some((t) => typeMatches(t, v))) return void out.push(`${at}: expected ${types.join(" or ")}, got ${typeOf(v)}.`);
    }
    if (schema.const !== undefined && !deepEqual(schema.const, v)) out.push(`${at}: must be ${JSON.stringify(schema.const)}.`);
    if (schema.enum && !schema.enum.some((e) => deepEqual(e, v))) out.push(`${at}: must be one of ${schema.enum.map((e) => JSON.stringify(e)).join(", ")}.`);

    if (typeof v === "string") {
      if (schema.minLength !== undefined && [...v].length < schema.minLength) out.push(`${at}: must be at least ${schema.minLength} characters.`);
      if (schema.maxLength !== undefined && [...v].length > schema.maxLength) out.push(`${at}: must be at most ${schema.maxLength} characters (is ${[...v].length}).`);
      if (schema.pattern !== undefined && !new RegExp(schema.pattern, "u").test(v)) out.push(`${at}: "${v}" doesn't match the pattern ${schema.pattern}.`);
    }
    if (typeof v === "number") {
      if (schema.minimum !== undefined && v < schema.minimum) out.push(`${at}: must be at least ${schema.minimum}.`);
      if (schema.maximum !== undefined && v > schema.maximum) out.push(`${at}: must be at most ${schema.maximum}.`);
      if (typeof schema.exclusiveMinimum === "number" && v <= schema.exclusiveMinimum) out.push(`${at}: must be greater than ${schema.exclusiveMinimum}.`);
      if (typeof schema.exclusiveMaximum === "number" && v >= schema.exclusiveMaximum) out.push(`${at}: must be less than ${schema.exclusiveMaximum}.`);
    }
    if (Array.isArray(v)) {
      if (schema.minItems !== undefined && v.length < schema.minItems) out.push(`${at}: needs at least ${schema.minItems} items.`);
      if (schema.maxItems !== undefined && v.length > schema.maxItems) out.push(`${at}: allows at most ${schema.maxItems} items.`);
      if (schema.uniqueItems && new Set(v.map((x) => JSON.stringify(x))).size !== v.length) out.push(`${at}: items must be unique.`);
      if (schema.items !== undefined) {
        v.forEach((item, i) => check(Array.isArray(schema.items) ? schema.items[i] : schema.items, item, `${path}[${i}]`, out));
      }
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const key of schema.required ?? []) if (!(key in v)) out.push(`${at}: missing required "${key}".`);
      const props = schema.properties ?? {};
      const patterns = Object.entries(schema.patternProperties ?? {}).map(([p, s]) => [new RegExp(p, "u"), s]);
      for (const [key, val] of Object.entries(v)) {
        const child = path ? `${path}.${key}` : key;
        let matched = false;
        if (key in props) {
          matched = true;
          check(props[key], val, child, out);
        }
        for (const [re, s] of patterns) {
          if (re.test(key)) {
            matched = true;
            check(s, val, child, out);
          }
        }
        if (!matched && schema.additionalProperties !== undefined) {
          if (schema.additionalProperties === false) out.push(`${child}: unknown field.`);
          else check(schema.additionalProperties, val, child, out);
        }
        if (schema.propertyNames) {
          for (const p of test(schema.propertyNames, key, child)) out.push(`${child}: invalid field name (${p}).`);
        }
      }
      for (const [key, dep] of Object.entries(schema.dependencies ?? {})) {
        if (!(key in v)) continue;
        if (Array.isArray(dep)) {
          for (const d of dep) if (!(d in v)) out.push(`${at}: "${key}" needs "${d}" too.`);
        } else {
          check(dep, v, path, out);
        }
      }
      if (schema.minProperties !== undefined && Object.keys(v).length < schema.minProperties) out.push(`${at}: needs at least ${schema.minProperties} fields.`);
    }

    if (schema.allOf) for (const s of schema.allOf) check(s, v, path, out);
    if (schema.anyOf && !schema.anyOf.some((s) => test(s, v, path).length === 0)) {
      const best = schema.anyOf.map((s) => test(s, v, path)).sort((a, b) => a.length - b.length)[0];
      out.push(`${at}: matches none of the allowed shapes. Closest: ${best.slice(0, 3).join(" ")}`);
    }
    if (schema.oneOf) {
      const ok = schema.oneOf.filter((s) => test(s, v, path).length === 0).length;
      if (ok !== 1) out.push(`${at}: must match exactly one allowed shape (matches ${ok}).`);
    }
    if (schema.not && test(schema.not, v, path).length === 0) out.push(`${at}: this value is not allowed.`);
    if (schema.if !== undefined) {
      if (test(schema.if, v, path).length === 0) {
        if (schema.then) check(schema.then, v, path, out);
      } else if (schema.else) check(schema.else, v, path, out);
    }
  }

  check(rootSchema, value, "", problems);
  return problems;
}
