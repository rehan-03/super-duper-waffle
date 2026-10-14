import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
async function login(page: Page, role: string) {
  await page.goto("/login");
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
}
test("theory completion and SQL blockers appear without unavailable activity tabs", async ({
  page,
}) => {
  await login(page, "student");
  const courses = await (await page.request.get("/api/v1/courses")).json(),
    course = courses.courses.find(
      (c: { code: string }) => c.code === "ACTIVITY-BROWSER",
    );
  const { topics } = await (
    await page.request.get(`/api/v1/courses/${course.id}/topics`)
  ).json();
  const theory = topics.find(
      (t: { key: string }) => t.key === "theory-fixture",
    ),
    practical = topics.find(
      (t: { key: string }) => t.key === "practical-fixture",
    );
  await page.goto(`/topics/${theory.id}`);
  await expect(page.getByRole("tab")).toHaveCount(1);
  await page.getByRole("button", { name: "Acknowledge lesson" }).click();
  await expect(
    page.getByRole("button", { name: "Lesson acknowledged" }),
  ).toBeDisabled();
  const progress = await (
    await page.request.get(`/api/v1/courses/${course.id}/progress`)
  ).json();
  expect(
    progress.topics.find((t: { id: string }) => t.id === theory.id).progress
      .completed,
  ).toBe(true);
  await page.goto(`/topics/${practical.id}`);
  await expect(page.getByRole("tab")).toHaveCount(1);
  await expect(
    page.getByText("Practical blocked:", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("External practical: completion blocked", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Acknowledge lesson" }).click();
  const after = await (
    await page.request.get(`/api/v1/courses/${course.id}/progress`)
  ).json();
  expect(
    after.topics.find((t: { id: string }) => t.id === practical.id).progress
      .completed,
  ).toBe(false);
});
test("faculty coverage and import studio have accessible usable controls", async ({
  page,
}) => {
  await login(page, "faculty");
  await page
    .getByRole("link", { name: "Syllabus coverage", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Source and draft coverage" }),
  ).toBeVisible();
  await expect(page.getByLabel("Search source topics")).toBeVisible();
  await page.getByLabel("Search source topics").fill("SQL Joins");
  await expect(
    page.getByRole("status").filter({ hasText: "Loading" }),
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /2301304/ })).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".card")
        .evaluateAll((nodes) =>
          nodes.every((n) => Number(getComputedStyle(n).opacity) === 1),
        ),
    )
    .toBe(true);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  const courses = await (await page.request.get("/api/v1/courses")).json(),
    course = courses.courses.find(
      (c: { code: string }) => c.code === "ACTIVITY-BROWSER",
    );
  await page.goto(`/faculty/courses/${course.id}`);
  await page.getByRole("button", { name: "Create draft revision" }).click();
  await expect(
    page.getByText("Draft revision 2", { exact: true }),
  ).toBeVisible();
  await page
    .getByText("Original draft library for assigned subjects", { exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Import selected drafts" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Incomplete source groups remain blocked", { exact: false }),
  ).toBeVisible();
});
