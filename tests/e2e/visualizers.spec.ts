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

async function clickStepForward(page: Page) {
  const classicNextStep = page.getByRole("button", {
    name: "Next step",
    exact: true,
  });
  if (await classicNextStep.count()) {
    await classicNextStep.click();
    return;
  }
  await page.getByRole("button", { name: /Step forward/i }).click();
}

async function clickStepBack(page: Page) {
  const classicPreviousStep = page.getByRole("button", {
    name: "Previous step",
    exact: true,
  });
  if (await classicPreviousStep.count()) {
    await classicPreviousStep.click();
    return;
  }
  await page.getByRole("button", { name: /Step back/i }).click();
}

async function clickReset(page: Page) {
  const classicReset = page.getByRole("button", { name: "Reset", exact: true });
  if (await classicReset.count()) {
    await classicReset.click();
    return;
  }
  await page.getByRole("button", { name: /Restart/i }).click();
}

const stepIndicatorPattern = /^Step \d+ (?:\/|of) \d+/;

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
      page
        .getByRole("heading", { name: "Official syllabus connection" })
        .or(page.getByText("Official Syllabus Reference:", { exact: false })),
    ).toBeVisible();
    await expect(
      page
        .locator(`[data-visualizer-kind="${kind}"]`)
        .or(
          page.getByLabel(
            /Algorithm visualization canvas|Unified SVG Graph Traversal Canvas/,
          ),
        ),
    ).toBeVisible();
    await clickStepForward(page);
    await expect(page.getByText(stepIndicatorPattern)).toBeVisible();
    await clickStepBack(page);
    await expect(page.getByText(stepIndicatorPattern)).toBeVisible();
    await clickStepForward(page);
    await clickReset(page);
    await expect(page.getByText(stepIndicatorPattern)).toBeVisible();
  }
});

test("play, pause, speed, keyboard and graph validation are interactive", async ({
  page,
}) => {
  await login(page);
  await page.goto("/visualizers/breadth-first-search");
  const classicSpeedSelect = page.getByLabel("Speed");
  if (await classicSpeedSelect.count()) {
    await classicSpeedSelect.selectOption("0.25");
  } else {
    await page.getByRole("button", { name: "0.5×", exact: true }).click();
  }
  await page.getByRole("button", { name: /Play/i }).click();
  await expect(
    page.getByRole("button", { name: /Pause/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Pause/i }).click();
  await expect(
    page.getByRole("button", { name: /Play/i }),
  ).toBeVisible();
  const keyboardTarget = page
    .getByLabel("Visualization state and keyboard playback controls")
    .or(page.getByLabel(/Visualizer$/));
  await keyboardTarget.press("ArrowRight");
  await expect(page.getByText(stepIndicatorPattern)).toBeVisible();
  const graphInput = page.getByLabel("Undirected edges");
  if (await graphInput.count()) {
    await graphInput.fill("0-9");
    await page.getByRole("button", { name: "Apply input", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("listed vertices");
  }
});
