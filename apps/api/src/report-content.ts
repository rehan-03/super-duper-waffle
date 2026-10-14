import { writeFile } from "node:fs/promises";
import { learningDrafts, sourceCoverage } from "./draft-library.js";
import { algorithmKeys, algorithms } from "@algolearn/shared";
const complete = learningDrafts.filter(
  (d) => d.authoringStatus === "COMPLETE_DRAFT",
);
const rows: string[] = [
  "# Draft content and simulation inventory",
  "",
  "Generated from the checked-in library on 2026-10-14. These counts are draft authoring status, not faculty approval or syllabus-wide completion.",
  "",
  `Library: ${learningDrafts.length} drafts; ${complete.length} complete modules; ${learningDrafts.filter((d) => d.authoringStatus === "INCOMPLETE").length} incomplete drafts; ${learningDrafts.filter((d) => d.authoringStatus === "SOURCE_BLOCKED").length} missing-source drafts. Complete modules contain ${complete.reduce((n, d) => n + d.questions.length, 0)} original draft questions and ${complete.reduce((n, d) => n + d.problems.length, 0)} coding specifications (3 sample/5 hidden cases each).`,
  "",
  "Every source computing paragraph group or extracted activity is represented, but these groups have not yet been fully split or explained for every explicit subtopic. The complete supplemental modules do not make their entire source group complete. Cross-page lab continuations, unsupported practical evidence and missing assessments remain explicit gaps.",
  "",
  "| Subject | Source groups / activities | Complete supplemental modules | Incomplete / source-blocked drafts |",
  "|---|---:|---:|---:|",
];
for (const code of [
  ...new Set(
    sourceCoverage.entries
      .filter((e) => e.scope === "COMPUTING")
      .map((e) => e.subjectCode),
  ),
].sort()) {
  const entries = sourceCoverage.entries.filter((e) => e.subjectCode === code),
    drafts = learningDrafts.filter((d) => d.sourceCode === code);
  rows.push(
    `| ${code} ${entries[0]!.subjectTitle} | ${entries.length} | ${drafts.filter((d) => d.authoringStatus === "COMPLETE_DRAFT").length} | ${drafts.filter((d) => d.authoringStatus !== "COMPLETE_DRAFT").length} |`,
  );
}
rows.push(
  "",
  "## Complete supplemental modules",
  "",
  "| Module | Required activities | Questions | Problems | Provenance |",
  "|---|---|---:|---:|---|",
);
for (const d of complete)
  rows.push(
    `| ${d.title} | ${d.requiredActivities.join(", ")} | ${d.questions.length} | ${d.problems.length} | ${d.sourceCode}, PDF ${d.sourcePages.join(", ")} |`,
  );
rows.push(
  "",
  "## Supported simulations",
  "",
  "All entries below are implemented deterministic traces. They do not imply quiz, practical or coding coverage for their source subject.",
  "",
  "| Simulation | Source | Pages |",
  "|---|---|---|",
);
for (const key of algorithmKeys) {
  const a = algorithms[key];
  rows.push(
    `| ${a.title} | ${a.syllabus.subjectCode} ${a.syllabus.unit} | ${a.syllabus.pages.join(", ")} |`,
  );
}
const candidates = [
  "Prim",
  "Kruskal",
  "AVL",
  "B-Tree",
  "B+ Tree",
  "Huffman",
  "knapsack",
  "OBST",
  "binomial",
  "matrix multiplication",
  "queen",
  "graph coloring",
  "TSP",
  "Dijkstra",
  "Warshall",
  "Banker",
  "round-robin",
  "page replacement",
  "Bresenham",
  "DDA",
  "Cohen",
  "Sutherland",
  "Liang",
  "Cyrus",
  "Apriori",
  "K-means",
  "KNN",
  "backpropagation",
];
rows.push(
  "",
  "## Explicit algorithms without a dedicated simulation",
  "",
  "This conservative inventory lists terms present in the supplied source text. Their lessons or lab descriptions must not display a simulation link until a registered implementation exists.",
  "",
);
for (const term of candidates) {
  const matches = sourceCoverage.entries.filter((e) =>
    e.sourceText.toLowerCase().includes(term.toLowerCase()),
  );
  if (matches.length)
    rows.push(
      `- ${term}: ${[...new Set(matches.map((e) => `${e.subjectCode} PDF ${e.pages.join(", ")}`))].join("; ")}`,
    );
}
await writeFile(
  new URL("../../../docs/content_coverage.md", import.meta.url),
  rows.join("\n") + "\n",
);
console.log(
  JSON.stringify({
    drafts: learningDrafts.length,
    complete: complete.length,
    questions: complete.reduce((n, d) => n + d.questions.length, 0),
    problems: complete.reduce((n, d) => n + d.problems.length, 0),
    visualizers: algorithmKeys.length,
  }),
);
