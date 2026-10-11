export const algorithms = {
  "linear-search": {
    title: "Linear search",
    complexity: "Time O(n), extra space O(1)",
    pseudocode: [
      "for each index i from 0",
      "if A[i] equals target",
      "return i",
      "return not found",
    ],
  },
  "binary-search": {
    title: "Binary search",
    complexity: "Time O(log n), extra space O(1); sorted input required",
    pseudocode: [
      "low = 0; high = n − 1; found = none",
      "while low ≤ high",
      "mid = floor((low + high) / 2)",
      "if A[mid] = target: record mid; search left",
      "else narrow the left or right range",
      "return first matching index or not found",
    ],
  },
  "bubble-sort": {
    title: "Bubble sort",
    complexity:
      "Worst/average time O(n²); best O(n) with early exit; extra space O(1)",
    pseudocode: [
      "for end from n − 1 down to 1",
      "compare neighboring values",
      "swap when left value is greater",
      "stop early if no swaps occurred",
    ],
  },
  "selection-sort": {
    title: "Selection sort",
    complexity: "Time O(n²), extra space O(1)",
    pseudocode: [
      "for each position i",
      "find the smallest remaining value",
      "swap that value into position i",
    ],
  },
  "insertion-sort": {
    title: "Insertion sort",
    complexity: "Worst/average time O(n²); best O(n); extra space O(1)",
    pseudocode: [
      "for i from 1 to n − 1",
      "move the new value left",
      "swap while preceding value is greater",
      "the prefix is now sorted",
    ],
  },
  "merge-sort": {
    title: "Merge sort",
    complexity: "Time O(n log n), extra space O(n)",
    pseudocode: [
      "split the range into two halves",
      "sort each half recursively",
      "merge sorted halves into auxiliary storage",
      "write the merged values back",
    ],
  },
} as const;
export type AlgorithmKey = keyof typeof algorithms;
export const algorithmKeys = Object.keys(algorithms) as AlgorithmKey[];
export type TraceStep = {
  values: number[];
  active: number[];
  sorted: number[];
  line: number;
  description: string;
  auxiliary: number[];
  found: number | null;
  done: boolean;
};
export function validateInput(
  values: number[],
  key: AlgorithmKey,
  target?: number,
) {
  if (
    values.length < 1 ||
    values.length > 50 ||
    values.some((v) => !Number.isInteger(v) || v < -999 || v > 999)
  )
    throw new Error("Enter 1–50 integers between −999 and 999.");
  if (
    key.endsWith("search") &&
    (!Number.isInteger(target) || target! < -999 || target! > 999)
  )
    throw new Error("Enter an integer target between −999 and 999.");
  if (
    key === "binary-search" &&
    values.some((v, i) => i > 0 && values[i - 1]! > v)
  )
    throw new Error(
      "Binary search needs sorted input. Use Sort input to continue.",
    );
}
export function buildTrace(
  input: number[],
  key: AlgorithmKey,
  target?: number,
): TraceStep[] {
  validateInput(input, key, target);
  const a = [...input],
    steps: TraceStep[] = [];
  let found: number | null = null;
  const step = (
    description: string,
    line: number,
    active: number[] = [],
    sorted: number[] = [],
    auxiliary: number[] = [],
    done = false,
  ) =>
    steps.push({
      values: [...a],
      active: [...active],
      sorted: [...sorted],
      line,
      description,
      auxiliary: [...auxiliary],
      found,
      done,
    });
  step("Ready. Use Play or Next step to begin.", 0);
  if (key === "linear-search") {
    for (let i = 0; i < a.length; i++) {
      step(`Compare index ${i}: ${a[i]} with target ${target}.`, 1, [i]);
      if (a[i] === target) {
        found = i;
        step(`First match is at index ${i}.`, 2, [i]);
        break;
      }
    }
  } else if (key === "binary-search") {
    let lo = 0,
      hi = a.length - 1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      step(`Range ${lo}–${hi}; compare index ${mid}: ${a[mid]}.`, 2, [
        lo,
        mid,
        hi,
      ]);
      if (a[mid] === target) {
        found = mid;
        hi = mid - 1;
        step(
          `Match at ${mid}; continue left to find the first occurrence.`,
          3,
          [mid],
        );
      } else if (a[mid]! < target!) {
        lo = mid + 1;
        step(`Target is larger; move the lower bound to ${lo}.`, 4, [mid]);
      } else {
        hi = mid - 1;
        step(`Target is smaller; move the upper bound to ${hi}.`, 4, [mid]);
      }
    }
  } else if (key === "bubble-sort") {
    for (let end = a.length - 1; end > 0; end--) {
      let swapped = false;
      for (let i = 0; i < end; i++) {
        step(`Compare neighboring indices ${i} and ${i + 1}.`, 1, [i, i + 1]);
        if (a[i]! > a[i + 1]!) {
          [a[i], a[i + 1]] = [a[i + 1]!, a[i]!];
          swapped = true;
          step("Swap the out-of-order neighbors.", 2, [i, i + 1]);
        }
      }
      step(
        `Index ${end} is in its final position.`,
        0,
        [],
        Array.from({ length: a.length - end }, (_, i) => end + i),
      );
      if (!swapped) {
        step("No swaps occurred; the array is sorted.", 3);
        break;
      }
    }
  } else if (key === "selection-sort") {
    for (let i = 0; i < a.length - 1; i++) {
      let min = i;
      for (let j = i + 1; j < a.length; j++) {
        step(`Compare candidate ${min} with index ${j}.`, 1, [min, j]);
        if (a[j]! < a[min]!) min = j;
      }
      if (min !== i) {
        [a[i], a[min]] = [a[min]!, a[i]!];
        step(`Move the smallest remaining value to index ${i}.`, 2, [i, min]);
      }
    }
  } else if (key === "insertion-sort") {
    for (let i = 1; i < a.length; i++) {
      let j = i;
      step(`Insert the value at index ${i} into the sorted prefix.`, 0, [i]);
      while (j > 0) {
        step(`Compare indices ${j - 1} and ${j}.`, 2, [j - 1, j]);
        if (a[j - 1]! <= a[j]!) break;
        [a[j - 1], a[j]] = [a[j]!, a[j - 1]!];
        step("Move the inserted value one position left.", 2, [j - 1, j]);
        j--;
      }
      step(
        `Prefix 0–${i} is sorted.`,
        3,
        [],
        Array.from({ length: i + 1 }, (_, n) => n),
      );
    }
  } else {
    const merge = (lo: number, hi: number) => {
      if (hi - lo <= 1) return;
      const mid = Math.floor((lo + hi) / 2);
      step(`Split range ${lo}–${hi - 1} at ${mid}.`, 0, [lo, mid, hi - 1]);
      merge(lo, mid);
      merge(mid, hi);
      const left = a.slice(lo, mid),
        right = a.slice(mid, hi),
        temp: number[] = [];
      let l = 0,
        r = 0;
      while (l < left.length || r < right.length) {
        if (r === right.length || (l < left.length && left[l]! <= right[r]!))
          temp.push(left[l++]!);
        else temp.push(right[r++]!);
        step(
          "Take the smaller front value into auxiliary storage.",
          2,
          [lo, hi - 1],
          [],
          temp,
        );
      }
      for (let i = 0; i < temp.length; i++) {
        a[lo + i] = temp[i]!;
        step(`Write ${temp[i]} to index ${lo + i}.`, 3, [lo + i], [], temp);
      }
    };
    merge(0, a.length);
  }
  step(
    key.endsWith("search")
      ? found === null
        ? "Target not found."
        : `First matching index: ${found}.`
      : "Sorting complete.",
    key.endsWith("search") ? algorithms[key].pseudocode.length - 1 : 0,
    found === null ? [] : [found],
    key.endsWith("search") ? [] : a.map((_, i) => i),
    [],
    true,
  );
  return steps;
}
export type EvidenceAnswer = {
  familyId: string;
  selectedOption: number | null;
  isCorrect: boolean | null;
};
export function mastery(attempts: { items: EvidenceAnswer[] }[]) {
  const latest = new Map<string, EvidenceAnswer>();
  for (const attempt of attempts.slice(0, 5))
    for (const item of attempt.items)
      if (!latest.has(item.familyId) && latest.size < 20)
        latest.set(item.familyId, item);
  const answers = [...latest.values()],
    evidenceCount = answers.filter((a) => a.selectedOption !== null).length;
  const score = answers.length
    ? Math.round(
        (answers.filter((a) => a.isCorrect).length / answers.length) * 100,
      )
    : null;
  const state = !attempts.length
    ? "UNASSESSED"
    : evidenceCount < 10
      ? "INSUFFICIENT_EVIDENCE"
      : score! < 60
        ? "WEAK"
        : score! < 80
          ? "DEVELOPING"
          : "MASTERED";
  return {
    score: evidenceCount >= 10 ? score : null,
    evidenceCount,
    familyCount: answers.length,
    state,
  };
}
export function quizMix(state: string) {
  return state === "MASTERED"
    ? [2, 4, 4]
    : state === "DEVELOPING"
      ? [3, 4, 3]
      : [6, 4, 0];
}
export function normalizeOutput(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t ]+$/, ""))
    .join("\n");
}
