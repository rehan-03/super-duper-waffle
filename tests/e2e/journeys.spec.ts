import { test, expect, type Page } from "@playwright/test";
async function login(page: Page, role: string) {
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${role}@browser.fixture`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Browser-fixture-password-2026");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}
test("student learning loop uses real curriculum, saves answers and drafts", async ({
  page,
}) => {
  await login(page, "student");
  await expect(page.getByText("Hello, Browser")).toBeVisible();
  await page
    .getByRole("link", { name: "Open curriculum", exact: false })
    .first()
    .click();
  await expect(
    page.getByText("2300118A · Computational Thinking and Problem Solving"),
  ).toBeVisible();
  await expect(page.getByText("Find the first matching index")).toBeVisible();
  await expect(page.getByText("Prerequisites: None")).toBeVisible();
  await page.getByRole("link", { name: "Explore topic", exact: false }).click();
  await page.getByRole("button", { name: "Acknowledge lesson" }).click();
  await expect(
    page.getByRole("button", { name: "Lesson acknowledged" }),
  ).toBeDisabled();
  await page.getByRole("tab", { name: "Visualize", exact: true }).click();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(
    page
      .getByText("Compare index 0: 9 with target 7.", { exact: true })
      .first(),
  ).toBeVisible();
  await page
    .getByLabel("Array state and keyboard playback controls")
    .press("ArrowRight");
  await expect(page.getByText(/^Step 2 \/ /)).toBeVisible();
  await page.getByRole("tab", { name: "Quiz", exact: true }).click();
  await page.getByRole("button", { name: "Start or resume quiz" }).click();
  for (let i = 0; i < 10; i++) {
    await page.getByLabel("Index 0", { exact: true }).check();
    await expect(
      page.getByRole("status").filter({ hasText: "Saved" }),
    ).toBeVisible();
    if (i < 9)
      await page.getByRole("button", { name: "Next question" }).click();
  }
  await page.reload();
  await expect(page.getByText("10 of 10 answered")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Submit quiz" }).click();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mastery evidence" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Review topic and next steps" }).click();
  await page.getByRole("tab", { name: "Code", exact: true }).click();
  await page
    .getByRole("link", { name: "Open coding workspace", exact: false })
    .first()
    .click();
  await expect(
    page.getByText(
      "An isolated Judge0 host has not been configured and verified.",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit solution" }),
  ).toBeDisabled();
  await expect(page.locator(".monaco-editor").first()).toBeVisible();
  // The real server persists an independently versioned draft; no request interception.
  const problemId = page.url().split("/").at(-1)!;
  const me = await page.request.get("/api/v1/me");
  const current = await page.request.get(
    `/api/v1/problems/${problemId}/drafts/python`,
  );
  const saved = await page.request.put(
    `/api/v1/problems/${problemId}/drafts/python`,
    {
      headers: {
        Origin: "http://localhost:5174",
        "X-CSRF-Token": (await me.json()).csrfToken,
      },
      data: { source: "print(0)\n", version: (await current.json()).version },
    },
  );
  expect(saved.status()).toBe(200);
  await page.reload();
  await expect(page.locator(".monaco-editor").first()).toBeVisible();
  await page.getByRole("link", { name: "Progress", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "See how you’re learning" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Account", exact: true }).click();
  await page.getByLabel("Motion preference").selectOption("reduce");
  await expect(
    page.getByRole("status").filter({ hasText: "Motion preference saved" }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
});
test("faculty can inspect actual students and create immutable-content revision drafts", async ({
  page,
}) => {
  await login(page, "faculty");
  await page
    .getByRole("link", { name: "Manage content", exact: false })
    .first()
    .click();
  await page.getByRole("button", { name: "Create draft revision" }).click();
  await expect(page.getByText("Draft revision 2")).toBeVisible();
  await expect(
    page.getByText("0 reviewed questions · 0 reviewed problems"),
  ).toBeVisible();
  await page.getByRole("link", { name: "My courses", exact: true }).click();
  await page.getByRole("link", { name: "View students", exact: true }).click();
  await expect(
    page.getByText("Browser Student", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View student detail" }).click();
  await expect(
    page.getByRole("heading", { name: "Browser Student" }),
  ).toBeVisible();
});
test("admin sees real source totals and audited enrollment features", async ({
  page,
}) => {
  await login(page, "admin");
  await page
    .getByRole("link", { name: "Curriculum references", exact: true })
    .click();
  await expect(
    page.getByText("89 subject references", { exact: false }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Read reference" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Source-page text" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Users", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "User accounts" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Audit history", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Audit history" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Service health", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Service health" }),
  ).toBeVisible();
  await expect(page.getByText("Secure executor")).toBeVisible();
});
test("mobile dashboard and curriculum reflow without page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page, "student");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page.getByRole("link", { name: "My courses", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My courses", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
