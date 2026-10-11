import { test, expect } from "@playwright/test";
import { writeFile, unlink } from "node:fs/promises";
import path from "node:path";
test("development server refuses private application and outbox files", async ({
  request,
}) => {
  const root = process.cwd(),
    canary = path.join(root, ".local", "private-file-canary.txt");
  const marker = "Private development file must not be served.";
  await writeFile(canary, marker);
  try {
    for (const file of [
      canary,
      path.join(root, "apps", "api", "src", "security.ts"),
    ]) {
      const response = await request.get(`/@fs/${file.replaceAll("\\", "/")}`);
      expect([403, 404]).toContain(response.status());
      expect(await response.text()).not.toContain(marker);
    }
  } finally {
    await unlink(canary);
  }
});
