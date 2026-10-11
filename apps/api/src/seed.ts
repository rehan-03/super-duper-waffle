import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { db } from "./db.js";
type Entry = {
  code: string;
  observed_code: string;
  title: string;
  year: number;
  semester: number | null;
  pathway: string;
  source_file: string;
  start_page: number;
  end_page: number;
  issues: string[];
  units: {
    number: number;
    title: string;
    source_pages: number[];
    topics: string[];
  }[];
};
type Catalog = {
  pattern: string;
  sources: {
    filename: string;
    sha256: string;
    pages: number;
    pages_text: { number: number; text: string }[];
  }[];
  subjects: Entry[];
};
const catalog: Catalog = JSON.parse(
  await readFile(new URL("../data/curriculum.json", import.meta.url), "utf8"),
);
// Validate the supplied originals, not merely hashes recorded in the derived JSON.
for (const source of catalog.sources) {
  const original = await readFile(
    new URL(
      `../../../Syllabus/${encodeURIComponent(source.filename)}`,
      import.meta.url,
    ),
  );
  if (createHash("sha256").update(original).digest("hex") !== source.sha256)
    throw new Error(
      `Original PDF checksum mismatch: ${source.filename}. No data imported.`,
    );
  if (
    source.pages_text.length !== source.pages ||
    new Set(source.pages_text.map((p) => p.number)).size !== source.pages ||
    source.pages_text.some((p) => p.number < 1 || p.number > source.pages)
  )
    throw new Error("Invalid source page inventory.");
}
for (const s of catalog.subjects) {
  const source = catalog.sources.find((src) => src.filename === s.source_file);
  if (
    !source ||
    s.start_page < 1 ||
    s.end_page > source.pages ||
    s.start_page > s.end_page ||
    ![1, 2, 3, 4].includes(s.year)
  )
    throw new Error("Invalid subject provenance.");
  if (
    s.pathway === "conditional_exit"
      ? s.semester !== null
      : ![s.year * 2 - 1, s.year * 2].includes(s.semester!)
  )
    throw new Error("Invalid year/semester assignment.");
  if (
    new Set(s.units.map((u) => u.number)).size !== s.units.length ||
    s.units.some((u) =>
      u.source_pages.some((p) => p < s.start_page || p > s.end_page),
    )
  )
    throw new Error("Invalid unit provenance.");
}
// Idempotent import of reference records; immutable learning content is a later milestone.
await db.$transaction(
  async (tx) => {
    const years = new Map<number, string>();
    const semesters = new Map<number, string>();
    for (let number = 1; number <= 4; number++) {
      const year = await tx.academicYear.upsert({
        where: { pattern_number: { pattern: catalog.pattern, number } },
        create: {
          pattern: catalog.pattern,
          number,
          label: ["First Year", "Second Year", "Third Year", "Final Year"][
            number - 1
          ]!,
        },
        update: {},
      });
      years.set(number, year.id);
      for (const semNumber of [number * 2 - 1, number * 2]) {
        const semester = await tx.semester.upsert({
          where: {
            academicYearId_number: {
              academicYearId: year.id,
              number: semNumber,
            },
          },
          create: {
            academicYearId: year.id,
            number: semNumber,
            label: `Semester ${["I", "II", "III", "IV", "V", "VI", "VII", "VIII"][semNumber - 1]}`,
          },
          update: {},
        });
        semesters.set(semNumber, semester.id);
      }
    }
    const sourceIds = new Map<string, string>();
    const pageIds = new Map<string, string>();
    for (const src of catalog.sources) {
      const source = await tx.curriculumSource.upsert({
        where: { filename: src.filename },
        create: {
          filename: src.filename,
          sha256: src.sha256,
          pageCount: src.pages,
        },
        update: {},
      });
      if (source.sha256 !== src.sha256)
        throw new Error(
          "Source hash changed: create a new curriculum edition instead of overwriting.",
        );
      sourceIds.set(src.filename, source.id);
      for (const p of src.pages_text) {
        const page = await tx.sourcePage.upsert({
          where: { sourceId_number: { sourceId: source.id, number: p.number } },
          create: { sourceId: source.id, ...p },
          update: {},
        });
        pageIds.set(`${src.filename}:${p.number}`, page.id);
      }
    }
    for (const s of catalog.subjects) {
      const sourceId = sourceIds.get(s.source_file)!;
      const subject = await tx.subject.upsert({
        where: { sourceId_code: { sourceId, code: s.code } },
        create: {
          sourceId,
          pattern: catalog.pattern,
          code: s.code,
          observedCode: s.observed_code,
          title: s.title,
          academicYearId: years.get(s.year)!,
          semesterId: s.semester === null ? null : semesters.get(s.semester)!,
          pathway: s.pathway,
          startPage: s.start_page,
          endPage: s.end_page,
          issues: s.issues,
        },
        update: {},
      });
      for (let page = s.start_page; page <= s.end_page; page++) {
        const sourcePageId = pageIds.get(`${s.source_file}:${page}`)!;
        await tx.subjectSourceReference.upsert({
          where: {
            subjectId_sourcePageId: { subjectId: subject.id, sourcePageId },
          },
          create: { subjectId: subject.id, sourcePageId },
          update: {},
        });
      }
      for (const u of s.units) {
        const unit = await tx.curriculumUnit.upsert({
          where: {
            subjectId_number: { subjectId: subject.id, number: u.number },
          },
          create: {
            subjectId: subject.id,
            number: u.number,
            title: u.title,
            sourcePages: u.source_pages,
          },
          update: {},
        });
        for (const page of u.source_pages) {
          const sourcePageId = pageIds.get(`${s.source_file}:${page}`)!;
          await tx.unitSourceReference.upsert({
            where: { unitId_sourcePageId: { unitId: unit.id, sourcePageId } },
            create: { unitId: unit.id, sourcePageId },
            update: {},
          });
        }
        for (const [index, text] of u.topics.entries())
          await tx.curriculumTopic.upsert({
            where: {
              unitId_position: { unitId: unit.id, position: index + 1 },
            },
            create: { unitId: unit.id, position: index + 1, text },
            update: {},
          });
      }
    }
  },
  { timeout: 120000 },
);
console.log(
  "Imported official reference curriculum: 4 sources, 229 pages, 89 subjects, 303 units. No scores or learning content fabricated.",
);
await db.$disconnect();
