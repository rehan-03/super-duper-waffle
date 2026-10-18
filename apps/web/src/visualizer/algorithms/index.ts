import type { AlgorithmDefinition } from "../types";
import { bubbleSortDefinition } from "./bubble-sort";
import { selectionSortDefinition } from "./selection-sort";
import { insertionSortDefinition } from "./insertion-sort";
import { mergeSortDefinition } from "./merge-sort";
import { quickSortDefinition } from "./quick-sort";
import { heapSortDefinition } from "./heap-sort";
import { shellSortDefinition } from "./shell-sort";
import { radixSortDefinition } from "./radix-sort";
import { linearSearchDefinition } from "./linear-search";
import { binarySearchDefinition } from "./binary-search";
import { bfsDefinition } from "./breadth-first-search";
import { dfsDefinition } from "./depth-first-search";

export const sortingAndSearchingAlgorithms: Record<string, AlgorithmDefinition> = {
  "bubble-sort": bubbleSortDefinition,
  "selection-sort": selectionSortDefinition,
  "insertion-sort": insertionSortDefinition,
  "merge-sort": mergeSortDefinition,
  "quick-sort": quickSortDefinition,
  "heap-sort": heapSortDefinition,
  "shell-sort": shellSortDefinition,
  "radix-sort": radixSortDefinition,
  "linear-search": linearSearchDefinition,
  "binary-search": binarySearchDefinition,
  "breadth-first-search": bfsDefinition,
  "depth-first-search": dfsDefinition,
};

export const algorithmList = Object.values(sortingAndSearchingAlgorithms);

export {
  bubbleSortDefinition,
  selectionSortDefinition,
  insertionSortDefinition,
  mergeSortDefinition,
  quickSortDefinition,
  heapSortDefinition,
  shellSortDefinition,
  radixSortDefinition,
  linearSearchDefinition,
  binarySearchDefinition,
  bfsDefinition,
  dfsDefinition,
};
