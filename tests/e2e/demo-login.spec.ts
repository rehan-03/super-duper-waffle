import { expect, test } from "@playwright/test";

const accounts = [
  { role: "Student", email: "student@demo.algolearn.local" },
  { role: "Faculty", email: "faculty@demo.algolearn.local" },
  { role: "Administrator", email: "admin@demo.algolearn.local" },
] as const;

test.describe("development demo credentials", () => {
  test.skip(
    process.env.E2E_PRODUCTION === "true",
    "Demo credentials are intentionally excluded from production builds.",
  );

  for (const account of accounts) {
    test(`${account.role} card fills the form and authenticates`, async ({
      page,
    }) => {
      await page.goto("/login");
      await page
        .getByRole("button", { name: new RegExp(`^${account.role}`) })
        .click();
      await expect(page.getByLabel("Email")).toHaveValue(account.email);
      await expect(page.locator('input[name="password"]')).toHaveValue(
        "AlgoLearn-demo-2026",
      );
      await page.getByRole("button", { name: "Log in", exact: true }).click();
      await expect(page).toHaveURL(/\/$/);
      await expect(
        page.getByRole("button", { name: "Sign out" }),
      ).toBeVisible();
    });
  }
});

test("production login omits demo credentials", async ({ page }) => {
  test.skip(
    process.env.E2E_PRODUCTION !== "true",
    "Production-only credential exclusion check.",
  );
  await page.goto("/login");
  await expect(page.getByText("Local demo accounts")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("AlgoLearn-demo-2026");
});
