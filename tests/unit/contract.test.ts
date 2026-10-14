import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
test("the OpenAPI contract covers every implemented route and its path parameters", () => {
  const contract = JSON.parse(readFileSync("docs/openapi.json", "utf8"));
  let operations = 0;
  for (const [file, prefix] of [
    ["app.ts", ""],
    ["auth.ts", "/auth"],
    ["learning.ts", ""],
    ["content-router.ts", ""],
    ["execution.ts", ""],
  ]) {
    const source = readFileSync(`apps/api/src/${file}`, "utf8");
    for (const match of source.matchAll(
      /(?:app|authRouter|learningRouter|contentRouter|executionRouter)\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g,
    )) {
      const method = match[1]!,
        path = (prefix + match[2]!.replace(/^\/api\/v1/, "")).replace(
          /:(\w+)/g,
          "{$1}",
        ),
        operation = contract.paths[path]?.[method];
      expect(operation, `${method} ${path}`).toBeDefined();
      for (const param of path.matchAll(/{(\w+)}/g))
        expect(
          operation.parameters.some(
            (p: { name: string; in: string; required: boolean }) =>
              p.name === param[1] && p.in === "path" && p.required,
          ),
        ).toBe(true);
      operations++;
    }
  }
  expect(operations).toBe(64);
});
