import test from "node:test";
import assert from "node:assert/strict";
import {
  algorithms,
  buildTrace,
  mastery,
  quizMix,
  normalizeOutput,
  type AlgorithmKey,
} from "@algolearn/shared";
test("all six visualizers are deterministic and preserve boundary results", () => {
  for (const key of Object.keys(algorithms) as AlgorithmKey[]) {
    for (const values of [
      [0],
      [-999, 999, 0, 0, -1],
      [3, 2, 1],
      Array.from({ length: 50 }, (_, i) => 25 - i),
    ]) {
      const input =
        key === "binary-search" ? [...values].sort((a, b) => a - b) : values;
      const trace = buildTrace(input, key, 0);
      assert.deepEqual(trace, buildTrace(input, key, 0));
      assert.deepEqual(trace[0]!.values, input);
      assert.ok(trace.at(-1)!.done);
      if (key.endsWith("search"))
        assert.equal(
          trace.at(-1)!.found,
          input.indexOf(0) === -1 ? null : input.indexOf(0),
        );
      else
        assert.deepEqual(
          trace.at(-1)!.values,
          [...input].sort((a, b) => a - b),
        );
    }
  }
  assert.equal(
    buildTrace([1, 2, 2, 2, 3], "binary-search", 2).at(-1)!.found,
    1,
  );
  assert.throws(() => buildTrace([2, 1], "binary-search", 1));
  for (const values of [[], [1000], [1.5], Array(51).fill(1)])
    assert.throws(() => buildTrace(values, "bubble-sort"));
});
test("mastery deduplicates latest question families and separates evidence", () => {
  const items = Array.from({ length: 10 }, (_, i) => ({
    familyId: String(i),
    selectedOption: 0,
    isCorrect: i < 8,
  }));
  assert.deepEqual(mastery([{ items }]), {
    score: 80,
    evidenceCount: 10,
    familyCount: 10,
    state: "MASTERED",
  });
  const repeated = items.map((i) => ({ ...i, isCorrect: false }));
  assert.equal(mastery([{ items: repeated }, { items }]).score, 0);
  const blanks = items.map((i) => ({
    ...i,
    selectedOption: null,
    isCorrect: false,
  }));
  assert.equal(
    mastery([{ items: blanks }, { items }]).state,
    "INSUFFICIENT_EVIDENCE",
  );
  assert.equal(mastery([]).state, "UNASSESSED");
  assert.deepEqual(quizMix("WEAK"), [6, 4, 0]);
  assert.deepEqual(quizMix("DEVELOPING"), [3, 4, 3]);
  assert.deepEqual(quizMix("MASTERED"), [2, 4, 4]);
  assert.equal(mastery([{ items: items.slice(0, 9) }]).score, null);
});
test("output comparison keeps meaningful differences including final newlines", () => {
  assert.equal(
    normalizeOutput("hello  \r\nworld\t\r\n"),
    normalizeOutput("hello\nworld\n"),
  );
  assert.notEqual(normalizeOutput("hello\n"), normalizeOutput("hello"));
  assert.notEqual(normalizeOutput(" hello\n"), normalizeOutput("hello\n"));
});
