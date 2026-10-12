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
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
}

test("admin can invite, create a course, assign and remove membership, and archive", async ({
  page,
}) => {
  await login(page, "admin");
  await page.goto("/admin/users");
  await page
    .getByLabel("Full name", { exact: true })
    .fill("Management Fixture");
  await page
    .getByLabel("Email", { exact: true })
    .fill("management@browser.fixture");
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(
    page.getByText("Invitation delivered to the local email preview."),
  ).toBeVisible();
  const account = page
    .getByRole("row")
    .filter({ hasText: "management@browser.fixture" });
  await account.getByRole("button", { name: "Resend invitation" }).click();
  await expect(
    page.getByText("Invitation delivered.", { exact: true }),
  ).toBeVisible();
  await page.goto("/admin/courses");
  await page
    .getByLabel("Course code", { exact: true })
    .fill("MANAGEMENT-FIXTURE");
  await page
    .getByLabel("Title", { exact: true })
    .fill("Management test course");
  await page.getByLabel("Term", { exact: true }).fill("Automated tests only");
  const subjects = await (await page.request.get("/api/v1/curriculum")).json();
  await page
    .getByLabel("Official subjects", { exact: true })
    .selectOption(subjects.subjects[0].id);
  await page
    .getByRole("button", { name: "Create course", exact: true })
    .click();
  await expect(
    page.getByText("Course created. Assign faculty and enroll students below."),
  ).toBeVisible();
  await page
    .getByLabel("Course", { exact: true })
    .selectOption({ label: "Management test course" });
  await page
    .getByLabel("Find account by name or email")
    .fill("management@browser.fixture");
  await page
    .getByLabel("Account", { exact: true })
    .selectOption({ label: "Management Fixture · student" });
  await page.getByRole("button", { name: "Assign to course" }).click();
  await expect(
    page.getByRole("button", { name: "Remove Management Fixture" }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove Management Fixture" }).click();
  await expect(page.getByText("Assignment removed.")).toBeVisible();
  const course = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Management test course",
      exact: true,
    }),
  });
  page.once("dialog", (dialog) => dialog.accept());
  await course.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(course.getByText("archived", { exact: true })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await course.getByRole("button", { name: "Reactivate", exact: true }).click();
  await expect(course.getByText("active", { exact: true })).toBeVisible();
});

test("faculty can save lesson, question and problem drafts while incomplete publication is blocked", async ({
  page,
}) => {
  await login(page, "faculty");
  const courses = await (await page.request.get("/api/v1/courses")).json();
  await page.goto(`/faculty/courses/${courses.courses[0].id}`);
  await expect(
    page.getByText("Published revision 1", { exact: true }),
  ).toBeVisible();
  const create = page.getByRole("button", { name: "Create draft revision" });
  if (await create.isVisible()) await create.click();
  await expect(page.getByText("Draft revision 2")).toBeVisible();
  const lesson = page
    .locator("form")
    .filter({ has: page.getByLabel("Lesson", { exact: true }) })
    .first();
  await lesson
    .getByLabel("Lesson", { exact: true })
    .fill(
      "Updated automated fixture lesson: compare each element to find the first matching index.",
    );
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/revisions") &&
        response.request().method() === "GET",
    ),
    lesson.getByRole("button", { name: "Save lesson draft" }).click(),
  ]);
  await expect(page.getByText("Draft revision 2")).toBeVisible();
  await page.getByRole("button", { name: "questions", exact: true }).click();
  await page.getByLabel("Objective", { exact: true }).fill("First occurrence");
  await page
    .getByLabel("Question prompt")
    .fill("Automated fixture: what is the first index of 5 in [5, 5]?");
  await page.getByLabel("Answer options", { exact: false }).fill("Zero\nOne");
  await page
    .getByLabel("Explanation", { exact: true })
    .fill("The first matching value appears at index zero.");
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/revisions") &&
        response.request().method() === "GET",
    ),
    page.getByRole("button", { name: "Save question", exact: true }).click(),
  ]);
  await page.getByRole("button", { name: "questions", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: /Automated fixture: what is the first index/,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "problems", exact: true }).click();
  await page.getByLabel("Problem title").fill("Management coding fixture");
  await page
    .getByLabel("Statement, input/output format and constraints")
    .fill(
      "Automated test fixture only: read an integer and print the same integer followed by a newline.",
    );
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/revisions") &&
        response.request().method() === "GET",
    ),
    page.getByRole("button", { name: "Save coding problem" }).click(),
  ]);
  await page.getByRole("button", { name: "problems", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Management coding fixture · draft" }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Validate & publish" }).click();
  await expect(page.getByRole("alert")).toContainText("review the lesson");
  await expect(page.getByText("Draft revision 2")).toBeVisible();
});

test("failed draft loading is recoverable and never overwrites stored code", async ({
  page,
}) => {
  await login(page, "student");
  const courses = await (await page.request.get("/api/v1/courses")).json();
  const topics = await (
    await page.request.get(`/api/v1/courses/${courses.courses[0].id}/topics`)
  ).json();
  const detail = await (
    await page.request.get(`/api/v1/topics/${topics.topics[0].id}`)
  ).json();
  const problemId = detail.problems[0].id;
  await page.route(`**/problems/${problemId}/drafts/python`, (route) =>
    route.abort(),
  );
  await page.goto(`/problems/${problemId}`);
  await expect(
    page.getByText("Draft could not load", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeDisabled();
  await page.unroute(`**/problems/${problemId}/drafts/python`);
  await page.getByRole("button", { name: "Retry loading draft" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved" }),
  ).toBeVisible();
  await expect(page.locator(".monaco-editor").first()).toBeVisible();
});
