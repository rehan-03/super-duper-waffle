import { test, expect } from "@playwright/test";
test("all four editor languages autosave independently and restore after switching and reload", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://")) external.push(request.url());
  });
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill("student@browser.fixture");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Browser-fixture-password-2026");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByText("Hello, Browser")).toBeVisible();
  const courses = await (await page.request.get("/api/v1/courses")).json(),
    topics = await (
      await page.request.get(`/api/v1/courses/${courses.courses[0].id}/topics`)
    ).json(),
    detail = await (
      await page.request.get(`/api/v1/topics/${topics.topics[0].id}`)
    ).json(),
    problemId = detail.problems[1].id;
  await page.goto(`/problems/${problemId}`);
  await expect(page.locator(".monaco-editor").first()).toBeVisible();
  for (const language of ["python", "c", "cpp", "java"]) {
    await page.getByLabel("Language", { exact: true }).selectOption(language);
    await expect(
      page.getByRole("status").filter({ hasText: "Saved" }),
    ).toBeVisible();
    await page
      .getByRole("textbox", { name: "Solution source code", exact: true })
      .focus();
    await page.keyboard.press("Control+a");
    await page.keyboard.insertText(`// autosave fixture ${language}\n`);
    await expect
      .poll(
        async () => {
          const result = await page.request.get(
            `/api/v1/problems/${problemId}/drafts/${language}`,
          );
          return (await result.json()).source;
        },
        { timeout: 8000 },
      )
      .toBe(`// autosave fixture ${language}\n`);
  }
  await page.getByLabel("Language", { exact: true }).selectOption("cpp");
  await expect(page.locator(".view-lines")).toContainText(
    "autosave fixture cpp",
  );
  await page.reload();
  await expect(page.locator(".monaco-editor").first()).toBeVisible();
  await expect(page.locator(".view-lines")).toContainText(
    "autosave fixture python",
  );
  expect(external).toEqual([]);
  await expect(
    page.getByRole("button", { name: "Run code", exact: true }),
  ).toBeDisabled();
});
