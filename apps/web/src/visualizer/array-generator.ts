import type { ArrayPattern } from "./types";

/**
 * Generates sample data arrays for algorithm visualizers.
 */
export function generateArray(
  size: number,
  pattern: ArrayPattern,
  customInput = "",
  mustBeSorted = false,
): number[] {
  const count = Math.max(4, Math.min(25, size));

  let arr: number[];

  if (pattern === "custom" && customInput.trim()) {
    const parsed = customInput
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => !isNaN(n));
    if (parsed.length > 0) {
      arr = parsed.slice(0, 30);
      if (mustBeSorted) arr.sort((a, b) => a - b);
      return arr;
    }
  }

  if (pattern === "reversed") {
    // Descending order from 95 down to 15
    const step = Math.floor(80 / (count - 1 || 1));
    arr = Array.from({ length: count }, (_, i) => 95 - i * step);
  } else if (pattern === "nearly-sorted") {
    // Mostly sorted with 1 or 2 inverted adjacent pairs
    const step = Math.floor(75 / (count - 1 || 1));
    arr = Array.from({ length: count }, (_, i) => 15 + i * step);
    if (!mustBeSorted) {
      if (arr.length >= 4) {
        const idx = Math.floor(arr.length / 2);
        const tmp = arr[idx]!;
        arr[idx] = arr[idx - 1]!;
        arr[idx - 1] = tmp;
      }
      if (arr.length >= 8) {
        const idx2 = arr.length - 2;
        const tmp = arr[idx2]!;
        arr[idx2] = arr[idx2 - 1]!;
        arr[idx2 - 1] = tmp;
      }
    }
  } else if (pattern === "duplicates") {
    // Duplicate-heavy array (e.g. only 3-4 distinct numbers)
    const distinct = [24, 48, 72, 90];
    arr = Array.from({ length: count }, (_, i) => distinct[i % distinct.length]!);
    // Shuffle a bit
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
  } else {
    // Default: Random integers between 12 and 98
    const min = 12;
    const max = 98;
    arr = [];
    for (let i = 0; i < count; i++) {
      arr.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }
  }

  if (mustBeSorted) {
    arr.sort((a, b) => a - b);
  }

  return arr;
}
