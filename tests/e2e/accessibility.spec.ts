import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function audit(page: import("@playwright/test").Page) {
  await expect
    .poll(() =>
      page
        .locator(".card,#main-content>div")
        .evaluateAll((nodes) =>
          nodes.every((n) => Number(getComputedStyle(n).opacity) === 1),
        ),
    )
    .toBe(true);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}
test("sign-in and all role dashboards pass automated accessibility checks", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { level: 1, name: "Welcome back" }),
  ).toBeVisible();
  await audit(page);
  for (const role of ["student", "faculty", "admin"]) {
    await page
      .getByLabel("Email", { exact: true })
      .fill(`${role}@browser.fixture`);
    await page
      .getByLabel("Password", { exact: true })
      .fill("Browser-fixture-password-2026");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Sign out", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: "Loading your workspace" }),
    ).toHaveCount(0);
    await audit(page);
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
  }
});
