import type { AlgorithmDefinition, BucketData, ElementState, VisualizerStep } from "../types";

export const radixSortPseudocode = [
  "radixSort(array):",
  "  maxVal = findMax(array)",
  "  for exp = 1, 10, 100... while maxVal / exp > 0:",
  "    initialize 10 digit buckets [0..9]",
  "    for each item in array: place item into bucket[(item / exp) % 10]",
  "    collect items from buckets 0..9 back into array",
  "array is completely sorted        // Done!",
];

export const radixSortDefinition: AlgorithmDefinition = {
  id: "radix-sort",
  name: "Radix Sort (LSD)",
  category: "sorting",
  description:
    "A non-comparative sorting algorithm that avoids comparisons by creating and distributing elements into 10 buckets according to their radix (digits) from Least Significant Digit (LSD) to Most Significant Digit (MSD).",
  complexity: {
    best: "O(d · (n + k))",
    average: "O(d · (n + k))",
    worst: "O(d · (n + k))",
    space: "O(n + k) auxiliary buckets",
  },
  pseudocode: radixSortPseudocode,
  generateSteps: (initialValues: number[]): VisualizerStep[] => {
    const n = initialValues.length;
    // Map to positive values for decimal LSD digits
    const minVal = Math.min(...initialValues);
    const offset = minVal < 0 ? Math.abs(minVal) : 0;
    const a = initialValues.map((v) => v + offset);
    const keys = a.map((val, idx) => `item-${idx}-${val}`);

    const steps: VisualizerStep[] = [];
    const comparisons = 0;
    const swaps = 0;
    const shifts = 0;
    let writes = 0;
    let operations = 0;
    let stepCount = 0;

    const maxVal = Math.max(...a, 1);

    function makeBuckets(bucketsMap: number[][]): BucketData[] {
      return bucketsMap.map((values, index) => ({
        index,
        values: [...values],
      }));
    }

    function recordStep(
      type: VisualizerStep["type"],
      indices: number[],
      pseudocodeLine: number,
      description: string,
      bucketsData?: BucketData[],
      customStates?: ElementState[],
    ) {
      stepCount++;
      operations++;
      steps.push({
        id: `radix-step-${stepCount}`,
        type,
        values: a.map((v) => v - offset),
        keys: [...keys],
        indices: [...indices],
        states: customStates ?? a.map(() => "default"),
        pseudocodeLine,
        description,
        counters: { comparisons, swaps, shifts, writes, operations },
        buckets: bucketsData,
      });
    }

    recordStep(
      "init",
      [],
      0,
      `Starting Radix Sort (LSD) on ${n} elements. Maximum value is ${maxVal - offset}. We will distribute elements into 10 buckets (0 to 9) per digit pass.`,
      makeBuckets(Array.from({ length: 10 }, () => [])),
    );

    for (let exp = 1; Math.floor(maxVal / exp) > 0; exp *= 10) {
      const digitName = exp === 1 ? "ones (1s)" : exp === 10 ? "tens (10s)" : "hundreds (100s)";
      const buckets: number[][] = Array.from({ length: 10 }, () => []);
      const bucketKeys: string[][] = Array.from({ length: 10 }, () => []);

      recordStep(
        "visit",
        [],
        2,
        `--- Processing digit place: ${digitName} (exp = ${exp}) ---`,
        makeBuckets(buckets),
      );

      // Distribute into buckets
      for (let i = 0; i < n; i++) {
        const val = a[i]!;
        const digit = Math.floor(val / exp) % 10;
        buckets[digit]!.push(val);
        bucketKeys[digit]!.push(keys[i]!);
        writes++;

        recordStep(
          "write",
          [i],
          4,
          `Element ${val - offset}: ${digitName} digit is ${digit}. Placed into Bucket [${digit}].`,
          makeBuckets(buckets),
          a.map((_, idx) => (idx === i ? "active" : "default")),
        );
      }

      // Collect back from buckets
      let writeIdx = 0;
      for (let b = 0; b < 10; b++) {
        for (let k = 0; k < buckets[b]!.length; k++) {
          writes++;
          const itemVal = a[writeIdx]!;
          a[writeIdx] = buckets[b]![k]!;
          keys[writeIdx] = bucketKeys[b]![k]!;

          recordStep(
            "write",
            [writeIdx],
            5,
            `Collected element ${itemVal - offset} from Bucket [${b}] back into array at index ${writeIdx}.`,
            makeBuckets(buckets),
            a.map((_, idx) => (idx === writeIdx ? "swapping" : "default")),
          );

          writeIdx++;
        }
      }
    }

    recordStep(
      "complete",
      Array.from({ length: n }, (_, k) => k),
      6,
      `Radix Sort complete! Array sorted in ${writes} total bucket writes without any pairwise comparisons.`,
      makeBuckets(Array.from({ length: 10 }, () => [])),
      a.map(() => "sorted"),
    );

    return steps;
  },
};
