import { expect, test } from "vitest";
import { buildTrace, mastery, type EvidenceAnswer } from "@algolearn/shared";
const answers = (
  prefix: string,
  count: number,
  correct = count,
): EvidenceAnswer[] =>
  Array.from({ length: count }, (_, i) => ({
    familyId: `${prefix}-${i}`,
    selectedOption: 0,
    isCorrect: i < correct,
  }));
test("only twenty latest families contribute even when old attempts contain more evidence", () => {
  const result = mastery([
    { items: answers("new", 10, 0) },
    { items: answers("middle", 10) },
    { items: answers("old", 10) },
  ]);
  expect(result).toEqual({
    score: 50,
    evidenceCount: 20,
    familyCount: 20,
    state: "WEAK",
  });
});
test("sixth and older attempts cannot establish the evidence floor", () => {
  const repeated = { items: answers("same", 9) };
  expect(
    mastery([
      repeated,
      repeated,
      repeated,
      repeated,
      repeated,
      { items: answers("older", 10) },
    ]).state,
  ).toBe("INSUFFICIENT_EVIDENCE");
});
test("exact sixty and eighty percent boundaries select developing and mastered", () => {
  expect(mastery([{ items: answers("boundary", 10, 5) }]).state).toBe("WEAK");
  expect(mastery([{ items: answers("boundary", 10, 6) }]).state).toBe(
    "DEVELOPING",
  );
  expect(mastery([{ items: answers("boundary", 10, 8) }]).state).toBe(
    "MASTERED",
  );
});
test("intermediate merge states use bounded auxiliary storage and do not mutate caller input", () => {
  const input = [4, -2, 4, 0],
    snapshot = [...input],
    trace = buildTrace(input, "merge-sort");
  expect(input).toEqual(snapshot);
  expect(trace.some((s) => s.auxiliary.length > 0)).toBe(true);
  for (const step of trace) {
    expect(step.values.length).toBe(input.length);
    expect(step.auxiliary.length).toBeLessThanOrEqual(input.length);
    expect(step.active.every((i) => i >= 0 && i < input.length)).toBe(true);
  }
});
