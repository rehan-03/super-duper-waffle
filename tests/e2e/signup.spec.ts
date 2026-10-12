import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("student can sign up, activate, log in, and see a real empty dashboard", async ({
  page,
}) => {
  const email = `signup-${crypto.randomUUID()}@browser.fixture`;
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/login");
  await page.getByRole("link", { name: "Sign up", exact: true }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(
    page.getByRole("heading", { name: "Create your student account" }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations.map((v) => v.id),
  ).toEqual([]);
  await page
    .getByLabel("Full name", { exact: true })
    .fill("Registration Student");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "activation link will be sent" }),
  ).toBeVisible();
  await expect(
    page.getByText("No external email was sent.", {
      exact: false,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Open local email preview" }).click();
  await expect(
    page.getByRole("heading", { name: "Local email preview" }),
  ).toBeVisible();
  await page.getByLabel("Filter by recipient").fill(email);
  const message = page.locator(".mail-preview-card").filter({ hasText: email });
  await expect(message).toBeVisible();
  await message.getByRole("link", { name: "Open activation link" }).click();
  await page
    .getByLabel("New password", { exact: true })
    .fill("Signup-browser-fixture-password-2026");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("Signup-browser-fixture-password-2026");
  await page
    .getByRole("button", { name: "Activate account", exact: true })
    .click();
  await expect(
    page.getByText("Account activated. You can now sign in."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Return to log in" }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Signup-browser-fixture-password-2026");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByText("Hello, Registration")).toBeVisible();
  const dashboard = await page.request.get("/api/v1/student/dashboard");
  expect(dashboard.status()).toBe(200);
  const data = await dashboard.json();
  expect(data.courses).toEqual([]);
  expect(data.stats.enrolledCourses).toBe(0);
  expect(data.stats.completedTopics).toBe(0);
  expect((await page.request.get("/api/v1/admin/overview")).status()).toBe(403);
});
