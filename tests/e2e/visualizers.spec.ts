import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill("student@browser.fixture");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Browser-fixture-password-2026");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByText("Hello, Browser")).toBeVisible();
}

const visualizers = [
  ["linear-search", "Linear search", "array"],
  ["binary-search", "Binary search", "array"],
  ["bubble-sort", "Bubble sort", "array"],
  ["selection-sort", "Selection sort", "array"],
  ["insertion-sort", "Insertion sort", "array"],
  ["merge-sort", "Merge sort", "array"],
  ["quick-sort", "Quick sort", "array"],
  ["shell-sort", "Shell sort", "array"],
  ["radix-sort", "Radix sort", "array"],
  ["heap-sort", "Heap sort", "array"],
  ["array-traversal", "Array traversal", "array"],
  ["linked-list-traversal", "Linked-list traversal", "linked-list"],
  ["stack-operations", "Stack operations", "stack"],
  ["queue-operations", "Queue operations", "queue"],
  ["binary-search-tree", "Binary search tree", "tree"],
  ["breadth-first-search", "Breadth-first search", "graph"],
  ["depth-first-search", "Depth-first search", "graph"],
] as const;

test("all syllabus visualizers render functional step and reset controls", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Visualizer lab", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Explore syllabus visualizations" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Open simulation/ })).toHaveCount(
    visualizers.length,
  );

  for (const [key, title, kind] of visualizers) {
    await page.goto(`/visualizers/${key}`);
    await expect(
      page.getByRole("heading", { level: 1, name: title }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Official syllabus connection" }),
    ).toBeVisible();
    await expect(
      page.locator(`[data-visualizer-kind="${kind}"]`),
    ).toBeVisible();
    await page.getByRole("button", { name: "Next step", exact: true }).click();
    await expect(page.getByText(/^Step 1 \/ /)).toBeVisible();
    await page
      .getByRole("button", { name: "Previous step", exact: true })
      .click();
    await expect(page.getByText(/^Step 0 \/ /)).toBeVisible();
    await page.getByRole("button", { name: "Next step", exact: true }).click();
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.getByText(/^Step 0 \/ /)).toBeVisible();
  }
});

test("play, pause, speed, keyboard and graph validation are interactive", async ({
  page,
}) => {
  await login(page);
  await page.goto("/visualizers/breadth-first-search");
  await page.getByLabel("Speed").selectOption("0.25");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Visualization state and keyboard playback controls")
    .press("ArrowRight");
  await expect(page.getByText(/^Step 1 \/ /)).toBeVisible();
  await page.getByLabel("Undirected edges").fill("0-9");
  await page.getByRole("button", { name: "Apply input", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("listed vertices");
});
