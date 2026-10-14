import { readFile } from "node:fs/promises";
import {
  algorithms,
  algorithmKeys,
  buildTrace,
  type AlgorithmKey,
} from "@algolearn/shared";
import type { Prisma } from "./generated/prisma/client.js";
import { supplementalDrafts } from "./supplemental-drafts.js";

export type SourceCoverage = {
  subjectCode: string;
  subjectTitle: string;
  source: string;
  year: number;
  semester: number | null;
  pathway: string;
  scope: string;
  key: string;
  unit: number | null;
  position: number;
  title: string;
  sourceText: string;
  pages: number[];
  kind: string;
  status: string;
  reason: string;
  issues: string[];
};
export const sourceCoverage: { version: number; entries: SourceCoverage[] } =
  JSON.parse(
    await readFile(new URL("../data/coverage.json", import.meta.url), "utf8"),
  );
type QuestionDraft = {
  objective: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  prompt: string;
  options: string[];
  correctOption: number;
  explanation: string;
};
type ProblemDraft = {
  title: string;
  statement: string;
  starterCodes: Prisma.InputJsonObject;
  tests: { input: string; expectedOutput: string; hidden: boolean }[];
};
export type LearningDraft = {
  key: string;
  title: string;
  unitLabel: string;
  lesson: string;
  objectives: string[];
  visualizerKey: AlgorithmKey | null;
  requiredActivities: string[];
  blockedActivities: { activity: string; reason: string }[];
  sourcePages: number[];
  sourceCode: string;
  sourceUnit: number | null;
  sourcePosition: number;
  authoringStatus: string;
  coverageKeys: string[];
  questions: QuestionDraft[];
  problems: ProblemDraft[];
};
const starterCodes = {
  c: "#include <stdio.h>\nint main(void) {\n  // Read the specification input, solve, and print the result.\n  return 0;\n}\n",
  cpp: "#include <iostream>\n#include <vector>\nint main() {\n  // Read the specification input, solve, and print the result.\n  return 0;\n}\n",
  java: "import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner input = new Scanner(System.in);\n    // Read the specification input, solve, and print the result.\n  }\n}\n",
  python:
    "import sys\n\ndef solve():\n    data = list(map(int, sys.stdin.read().split()))\n    # Read the specification input, solve, and print the result.\n\nif __name__ == '__main__':\n    solve()\n",
};
function question(
  difficulty: QuestionDraft["difficulty"],
  prompt: string,
  answer: string,
  wrong: string[],
  explanation: string,
  index: number,
): QuestionDraft {
  const options = [
    ...new Set([answer, ...wrong.filter((v) => v !== answer)]),
  ].slice(0, 4);
  const offset = index % options.length;
  return {
    difficulty,
    objective: "Trace the algorithm and justify its behavior",
    prompt,
    options: [...options.slice(offset), ...options.slice(0, offset)],
    correctOption: (options.length - offset) % options.length,
    explanation,
  };
}
const sortNotes: Record<
  string,
  {
    explanation: string;
    example: string;
    misconception: string;
    invariant: string;
    worst: string;
    space: string;
    stable: string;
  }
> = {
  "bubble-sort": {
    explanation:
      "Compare adjacent values and exchange an inverted pair. After a left-to-right pass, the maximum remaining value has reached the right boundary. Repeat on the shorter prefix. A pass with no exchanges proves the whole remaining range is already sorted.",
    example:
      "[4, 1, 3]: compare 4 and 1 to obtain [1, 4, 3]; compare 4 and 3 to obtain [1, 3, 4]. The next pass makes no exchanges.",
    misconception:
      "One pass does not generally sort every value. It fixes the largest remaining value; early exit is justified only by a complete pass with no exchange.",
    invariant:
      "The suffix beyond the current boundary contains final-position values",
    worst: "O(n²)",
    space: "O(1)",
    stable: "Yes, when equal adjacent values are not swapped",
  },
  "selection-sort": {
    explanation:
      "For each output position, scan the unsorted suffix to locate its smallest value, then exchange that value with the current position. The selection is made after considering every candidate, so the prefix grows by one final-position value each iteration.",
    example:
      "[4, 1, 3]: the smallest value is 1 at index 1, so exchange indices 0 and 1. The remaining suffix [4, 3] has minimum 3, producing [1, 3, 4].",
    misconception:
      "Selection sort is not generally stable. Exchanging a distant minimum can reverse the relative order of records whose keys are equal.",
    invariant:
      "The prefix before the current position is sorted and contains the smallest values",
    worst: "O(n²)",
    space: "O(1)",
    stable: "No, the usual distant-swap implementation can reorder equal keys",
  },
  "insertion-sort": {
    explanation:
      "Maintain a sorted prefix. Save the next value, shift larger preceding values right, and place the saved value in the gap. The invariant is restored after each insertion. Nearly sorted inputs need few movements; reverse sorted inputs need many.",
    example:
      "[4, 1, 3]: insert 1 before 4 to get [1, 4, 3]. Save 3, shift 4 right, and place 3 after 1, obtaining [1, 3, 4].",
    misconception:
      "The input need not already be sorted. Only the prefix is required to be sorted at the start of each iteration.",
    invariant: "The processed prefix is sorted before the next insertion",
    worst: "O(n²)",
    space: "O(1)",
    stable: "Yes, when only strictly greater keys are moved",
  },
  "merge-sort": {
    explanation:
      "Split a range into halves until each range has at most one value. Recursively sort each half, then merge by repeatedly taking the smaller front value. Each level processes all n values and there are logarithmically many levels. The array implementation needs auxiliary storage.",
    example:
      "[4, 1, 3] splits into [4] and [1, 3]. Merge the sorted halves by taking 1, then 3, then 4. Equal keys are taken from the left half first to preserve stability.",
    misconception:
      "Two sorted halves are not yet a sorted concatenation. A merge must compare their front values.",
    invariant: "Each half is sorted before its parent range is merged",
    worst: "O(n log n)",
    space: "O(n)",
    stable: "Yes, when equal keys are taken from the left half first",
  },
  "quick-sort": {
    explanation:
      "Choose a pivot and partition the range into values at most the pivot and values greater than it. Place the pivot at their boundary and recursively sort the two ranges. The supplied simulation uses the last value as a pivot and a Lomuto partition. Balanced partitions are fast; repeatedly unbalanced partitions can be quadratic.",
    example:
      "[4, 1, 3] uses pivot 3. Move 1 to the left partition and place 3 at the boundary to obtain [1, 3, 4]. Each one-value partition is already sorted.",
    misconception:
      "A partition is not a complete sort. It places the pivot and divides the remaining values; each partition still needs recursive work.",
    invariant:
      "After partitioning, the pivot separates values <= pivot from values > pivot",
    worst: "O(n²)",
    space: "O(n) worst-case recursion stack",
    stable: "No, partition swaps can reorder equal keys",
  },
  "shell-sort": {
    explanation:
      "Perform insertion sort on gap-separated subsequences. Start with gap floor(n/2), then halve the gap until it reaches 1. Large gaps move values long distances early; the final gap-1 pass establishes ordinary sorted order. Complexity depends on the gap sequence.",
    example:
      "[4, 1, 3] has initial gap 1, so its pass is an insertion sort: insert 1 before 4, then insert 3 between 1 and 4.",
    misconception:
      "An array that is sorted for a gap larger than 1 may still be unsorted overall. The gap-1 pass is essential.",
    invariant:
      "Each completed pass leaves every gap-separated subsequence sorted",
    worst: "O(n²) for the halving gap sequence",
    space: "O(1)",
    stable: "No, gap movements can reorder equal keys",
  },
  "radix-sort": {
    explanation:
      "Least-significant-digit radix sort processes one digit at a time using a stable distribution. This simulation supports signed bounded integers by subtracting the minimum key before extracting decimal digits. The offset preserves numeric order. Stability at every digit pass preserves the ordering established by previous passes.",
    example:
      "[-2, 4, 1] is associated with offset keys [0, 6, 3]. Stable distribution on the units digit produces [-2, 1, 4]. More passes are needed if the largest offset key has more digits.",
    misconception:
      "Sorting each digit with an unstable method can destroy earlier digit order. Negative values also require an explicit signed-key strategy.",
    invariant:
      "After d stable passes, values are ordered by their d least significant offset-key digits",
    worst: "O(d(n + 10)) for d decimal digits",
    space: "O(n + 10)",
    stable: "Yes, with stable distribution at each digit pass",
  },
  "heap-sort": {
    explanation:
      "Build a max heap bottom up, so each parent is at least as large as its children. Exchange the root maximum with the last unsorted position, shorten the heap, and sift the new root down. Repeat until the sorted suffix fills the array. Bottom-up heap construction is linear; extracting all values takes O(n log n).",
    example:
      "[4, 1, 3] is already a max heap. Exchange 4 and 3 to get [3, 1, 4]. The two-value heap has root 3, which is exchanged with 1 to produce [1, 3, 4].",
    misconception:
      "A heap is not a fully sorted array. It guarantees parent-child order, not sorted order among siblings.",
    invariant:
      "The unsorted prefix is a max heap and the suffix is in final sorted order",
    worst: "O(n log n)",
    space: "O(1)",
    stable: "No, root/end swaps can reorder equal keys",
  },
};
function algorithmQuestions(key: AlgorithmKey): QuestionDraft[] {
  const questions: QuestionDraft[] = [];
  const notes = sortNotes[key];
  const search = key === "linear-search" || key === "binary-search";
  const inputs = [
    [4, 1, 3],
    [-2, 4, 1],
    [5, 2, 5, 1],
    [9, 0, -3, 6],
    [1, 1, 1],
    [8, 7, 6, 5],
  ];
  for (let i = 0; i < 6; i++) {
    const a =
      search && key === "binary-search"
        ? [...inputs[i]!].sort((a, b) => a - b)
        : inputs[i]!;
    const target = i === 4 ? 2 : a.at(-1)!;
    const result = search
      ? String(a.indexOf(target))
      : JSON.stringify([...a].sort((a, b) => a - b));
    questions.push(
      question(
        "EASY",
        search
          ? `${algorithms[key].title}: find the first zero-based index of ${target} in ${JSON.stringify(a)}. Use -1 if absent.`
          : `${algorithms[key].title}: what is the final ascending order of ${JSON.stringify(a)}?`,
        result,
        search
          ? [
              String(a.length),
              String(a.indexOf(target) + 1),
              "No result is defined",
            ]
          : [
              JSON.stringify(a),
              JSON.stringify([...a].sort((a, b) => b - a)),
              "The input cannot contain duplicates",
            ],
        search
          ? "Visit or narrow the range while retaining the first matching index. Return -1 when there is no matching value."
          : "Ascending numeric order preserves every value, including duplicate and negative keys.",
        i,
      ),
    );
  }
  for (let i = 0; i < 7; i++) {
    const a = [i + 4, 1, -i, 3];
    if (key === "binary-search") a.sort((a, b) => a - b);
    const trace = buildTrace(a, key, search ? 3 : undefined),
      at = Math.min(i + 2, trace.length - 2),
      step = trace[at]!;
    questions.push(
      question(
        "MEDIUM",
        `Using ${algorithms[key].title} with the documented simulation convention, input ${JSON.stringify(a)}${search ? " and target 3" : ""}, which array state follows this operation: "${step.description}"?`,
        JSON.stringify(step.values),
        [
          JSON.stringify([...step.values].reverse()),
          JSON.stringify(step.values.map((v) => v + 1)),
          JSON.stringify([...step.values].sort((a, b) => b - a)),
        ],
        `Trace the displayed operation without skipping later work. This operation uses pseudocode line ${step.line + 1}; the state is ${JSON.stringify(step.values)}.`,
        i + 6,
      ),
    );
  }
  const hard = search
    ? [
        [
          "A search encounters duplicate keys. Which result meets this topic's contract?",
          "The smallest matching zero-based index",
          [
            "Any matching index",
            "The number of duplicates",
            "The last matching index",
          ],
          "The contract explicitly returns the first occurrence.",
        ],
        [
          "Which input condition is necessary for binary search but unnecessary for linear search?",
          "The values are sorted in the searched order",
          [
            "All keys are positive",
            "Every key is distinct",
            "There are exactly ten keys",
          ],
          "Binary search discards a range by reasoning about sorted order.",
        ],
        [
          "Binary search finds the target at its midpoint. How can it still find the first duplicate?",
          "Remember that index and continue in the left range",
          [
            "Return immediately in every case",
            "Continue only to the right",
            "Restart with an unsorted array",
          ],
          "A preceding duplicate can only lie to the left of a matching midpoint.",
        ],
        [
          "What is the worst-case number of comparisons for linear search over n values when the target is absent?",
          "n",
          ["1", "floor(log2(n))", "n squared"],
          "An absent target requires checking all n candidates.",
        ],
        [
          "Which argument justifies discarding the right half in binary search when the midpoint value exceeds the target?",
          "Every value to the right is at least the midpoint value",
          [
            "The right half has fewer values",
            "The target must be at index zero",
            "All duplicates are in the left half",
          ],
          "Sorted order proves every value in the discarded range is too large.",
        ],
        [
          "A binary-search implementation repeats while low <= high. After discarding midpoint m, what ensures termination?",
          "Use high = m - 1 or low = m + 1",
          [
            "Keep both bounds unchanged",
            "Set low = m every time",
            "Compare the target with the array length",
          ],
          "Strictly shrinking the candidate interval prevents revisiting the same midpoint.",
        ],
        [
          "When the target is absent, which learning evidence can a correct search result establish?",
          "Only the specified problem result; quiz mastery is separate",
          [
            "Automatic mastery of every topic",
            "Faculty approval of the lesson",
            "Completion of an external lab",
          ],
          "Output evidence, quiz evidence and review records have different purposes.",
        ],
      ]
    : [
        [
          "Which invariant explains why the next iteration is valid?",
          notes!.invariant,
          [
            "Every value is already in final position after any operation",
            "All keys must be positive",
            "Duplicates have been removed",
          ],
          "An invariant states what is preserved between iterations, rather than claiming the algorithm is finished.",
        ],
        [
          "Which worst-case time bound applies to this documented implementation?",
          notes!.worst,
          [
            "O(1) for every input",
            "O(n!) for every input",
            "No bound can be stated",
          ],
          algorithms[key].complexity,
        ],
        [
          "Which additional storage bound applies to this implementation?",
          notes!.space,
          [
            "It always requires a database server",
            "Exactly one byte for any n",
            "O(n!) additional arrays",
          ],
          "Count auxiliary arrays and recursion stack separately from the input array.",
        ],
        [
          "Does the documented implementation preserve the input order of equal-key records?",
          notes!.stable,
          [
            "Every sorting method is stable by definition",
            "Stability means sorting only positive values",
            "Duplicate keys make sorting impossible",
          ],
          notes!.misconception,
        ],
        [
          "The input contains repeated negative keys. Which correctness claim must still hold?",
          "Output is nondecreasing and has the same multiplicity of every key",
          [
            "Negative keys are silently deleted",
            "Only distinct keys are returned",
            "Only the maximum is preserved",
          ],
          "Sorting reorders values; it does not change the multiset.",
        ],
        [
          "A test checks that the output is sorted but never checks input multiplicities. Which faulty solution could pass?",
          "One that prints a sorted sequence containing invented values",
          [
            "Every correct comparison sort",
            "A stable method only",
            "No faulty solution can pass",
          ],
          "Sortedness alone is insufficient: correctness also requires a permutation of the input.",
        ],
        [
          "Which conclusion is justified by passing sample and hidden output cases?",
          "The solution matches these cases; the named algorithm still needs code review",
          [
            "The implementation necessarily uses the requested algorithm",
            "A proof of correctness is unnecessary",
            "Faculty review is automatically recorded",
          ],
          "Output tests cannot prove which internal algorithm was used. Explain or review the implementation too.",
        ],
      ];
  for (const [i, row] of hard.entries())
    questions.push(
      question(
        "HARD",
        `${algorithms[key].title}: ${row[0] as string}`,
        row[1] as string,
        row[2] as string[],
        row[3] as string,
        i + 13,
      ),
    );
  return questions;
}
function algorithmProblems(key: AlgorithmKey): ProblemDraft[] {
  const search = key === "linear-search" || key === "binary-search";
  const cases = [
    { a: [4, 1, 3], target: 1 },
    { a: [5, 5, 2], target: 5 },
    { a: [-2, 0, 7], target: 6 },
    { a: [1], target: 1 },
    { a: [2, 2, 2, 2], target: 2 },
    { a: [-999, 999, 0, -999], target: -999 },
    { a: [8, 7, 6, 5, 4], target: 4 },
    { a: [0, -1, 1, 0], target: 0 },
  ];
  return [0, 1].map((variant) => ({
    title: `${algorithms[key].title}: ${search ? (variant ? "count matches" : "first occurrence") : variant ? "lower median" : "ascending sequence"}`,
    statement: `Original draft exercise. Use ${algorithms[key].title} and explain its invariant in a comment. Output tests check behavior; faculty code review is needed to verify the algorithm choice.\nInput: an integer n (1 <= n <= 50), followed by n integers in [-999, 999]${search ? ", followed by the target integer. Binary-search inputs are nondecreasing" : ". Values may repeat"}. Whitespace separates tokens.\nOutput: ${search ? (variant ? "the number of elements equal to the target" : "the first zero-based matching index, or -1 when absent") : variant ? "after ascending sorting, the value at zero-based index floor((n - 1) / 2) (the lower median)" : "all n values in nondecreasing order, separated by one space"}. End output with one newline. Handle a single element, repeated keys, negative keys and absent targets where applicable.`,
    starterCodes,
    tests: cases.map((c, i) => {
      const a = key === "binary-search" ? [...c.a].sort((a, b) => a - b) : c.a;
      const sorted = [...a].sort((a, b) => a - b);
      const expected = search
        ? variant
          ? String(a.filter((v) => v === c.target).length)
          : String(a.indexOf(c.target))
        : variant
          ? String(sorted[Math.floor((a.length - 1) / 2)])
          : sorted.join(" ");
      return {
        input: `${a.length}\n${a.join(" ")}\n${search ? `${c.target}\n` : ""}`,
        expectedOutput: `${expected}\n`,
        hidden: i >= 3,
      };
    }),
  }));
}

// Each note is original educational prose. Match only explicit source terms;
// unmatched material stays visibly incomplete rather than acquiring a invented lesson.
const conceptNotes: [RegExp, string, string, string][] = [
  [
    /requirements?|SRS/i,
    "Requirements",
    "A requirement describes an observable capability or quality constraint. Separate stakeholder needs from implementation choices, and give each requirement a testable acceptance criterion. Functional requirements describe behavior; quality requirements describe constraints such as reliability or response time.",
    "For a library system, 'borrow a book' is too broad. Specify who may borrow, the maximum active loans, what happens when a copy is unavailable, and the observable confirmation. A screen design alone is not a complete requirement.",
  ],
  [
    /software testing|test cases|quality assurance/i,
    "Testing",
    "Design tests from expected behavior and boundaries. A test has a setup, an action and an observable expected result. Unit tests isolate a small behavior; integration tests check collaborating components; system tests exercise the complete product. Passing tests increases evidence but cannot prove the absence of every defect.",
    "For an allowed age interval 18 through 55, test 17, 18, 55 and 56. These cases distinguish inclusive boundaries from off-by-one implementations. Do not infer a valid upper boundary from only a typical input.",
  ],
  [
    /normaliz|functional depend/i,
    "Normalization",
    "A functional dependency X -> Y means that rows agreeing on X must agree on Y. Normalization uses dependencies to reduce update, insertion and deletion anomalies. A decomposition must preserve information through a lossless join; dependency preservation is a separate desirable property.",
    "If student_id determines student_name and course_id determines course_title, repeatedly storing both names in an enrollment table permits contradictory updates. Separate student and course entities and let enrollments reference their identifiers. Splitting tables arbitrarily does not establish a lossless decomposition.",
  ],
  [
    /SQL|relational algebra|joins|queries/i,
    "Relational queries",
    "A relational query selects and combines rows according to explicit conditions. Joins associate rows by a predicate; aggregation summarizes groups. SQL NULL represents missing information and comparisons can be unknown. Filtering on a nullable outer-joined column can remove unmatched rows.",
    "An instructor LEFT JOIN student keeps instructors with no student only if the later conditions also preserve those null-extended rows. Counting student.id counts matched students; COUNT(*) also counts the outer-join placeholder row. Use a real database lab to check SQL behavior.",
  ],
  [
    /transaction|concurrency control|serializ/i,
    "Transactions",
    "A transaction groups related operations into one logical change. Atomicity prevents partial changes, consistency concerns invariants, isolation governs interactions between concurrent transactions, and durability preserves committed changes. A schedule must be analyzed for conflicts; concurrency is not the same as correct serialization.",
    "Two transfers reading the same account balance can both debit against stale data. A conditional update or an appropriate lock must serialize the relevant change. Starting a transaction alone does not guarantee the required isolation.",
  ],
  [
    /process scheduling|round.robin|FCFS|shortest job|CPU scheduling/i,
    "Process scheduling",
    "Scheduling chooses which ready process receives CPU time. Waiting time measures time spent ready but not running; turnaround is completion time minus arrival time. First-come-first-served is nonpreemptive; round robin gives a bounded quantum and cycles ready processes. State the arrival and preemption conventions before calculating a schedule.",
    "For arrivals at 0 and burst times 3 and 5, FCFS completes at 3 and 8. Waiting times are 0 and 3; turnaround times are 3 and 8. Average waiting is 1.5 and average turnaround is 5.5. CPU burst and turnaround are different quantities.",
  ],
  [
    /deadlock|banker/i,
    "Deadlock",
    "Deadlock involves processes waiting indefinitely for resources held by one another. Mutual exclusion, hold-and-wait, no preemption and circular wait are the four classic necessary conditions. A safe state has an order in which every process can obtain its remaining need and finish; unsafe does not necessarily mean already deadlocked.",
    "With one available unit, a process needing one more unit can finish and release its allocation; this release may enable another process. Banker's analysis repeatedly looks for such a process. Do not classify a state only from the available vector without examining allocations and remaining needs.",
  ],
  [
    /page replacement|paging|virtual memory|LRU|FIFO/i,
    "Virtual memory",
    "Virtual memory maps process addresses to physical frames. A page fault means the referenced page is absent and must be brought in. FIFO evicts the oldest loaded page; LRU evicts the least recently referenced page; optimal replacement evicts the page used farthest in the future and serves as an offline comparison.",
    "With two frames and references 1, 2, 1, 3, LRU keeps page 1 when 3 arrives because 2 was less recently referenced. FIFO instead evicts 1 because it was loaded first. Replacement policies track different histories.",
  ],
  [
    /TCP|UDP|transport layer/i,
    "Transport protocols",
    "Transport protocols connect application endpoints. TCP presents a reliable ordered byte stream with connection state, acknowledgments and retransmission. UDP sends independent datagrams without guaranteeing delivery or ordering. Applications must still define their own message framing over a byte stream.",
    "Two TCP writes do not imply two receiver reads. Prefix a message with its length or use a defined delimiter and parse the stream. A reliable byte stream does not automatically provide application-level message boundaries.",
  ],
  [
    /IP address|subnet|IPv4|network layer/i,
    "Addressing",
    "An IP prefix identifies the network portion of an address; the remaining bits identify addresses within that prefix. Routing uses destination prefixes and typically chooses the longest matching prefix. Link-layer identifiers and network-layer addresses have different scopes.",
    "An IPv4 /24 prefix leaves eight host bits and covers 256 address values. Conventional unicast subnet use reserves the network and broadcast addresses, giving 254 host addresses. Do not extend this reservation rule blindly to every special prefix or protocol.",
  ],
  [
    /cryptograph|encryption|symmetric|RSA|AES/i,
    "Cryptography",
    "Encryption protects confidentiality under a key and an explicit threat model. Symmetric systems use a shared secret; public-key systems separate public and private operations. A cryptographic hash is not encryption. Authentication and integrity require suitable mechanisms in addition to confidentiality.",
    "Encrypting an editable message without authenticating it can leave modification attacks undetected. An authenticated-encryption design checks integrity before accepting plaintext. Do not label a reversible encoding such as Base64 as encryption.",
  ],
  [
    /neural network|deep learning|backpropagation/i,
    "Neural learning",
    "A neural network composes parameterized transformations. Training minimizes a stated loss using gradients computed through the computation graph. Backpropagation applies the chain rule; it does not by itself guarantee a useful model. Evaluate on held-out data and keep preprocessing learned from the training set separate from the test set.",
    "If prediction is 3 and target is 1, squared error is (3 - 1)^2 = 4. For a single linear output y = w*x with x = 2, the derivative of squared error with respect to w is 2*(y - target)*x. A small training loss alone does not establish generalization.",
  ],
  [
    /machine learning|classification|regression|data science/i,
    "Model evaluation",
    "Supervised learning uses labeled examples to learn a mapping. Classification predicts categories and regression predicts quantities. Training fits parameters; validation supports model choices; a held-out test estimates performance on unseen data. Metrics must match the task and class distribution.",
    "In a dataset with 95 negatives and 5 positives, always predicting negative gives 95% accuracy but detects no positives. Inspect recall and precision as well as accuracy. Fit normalization on training data to avoid leaking test information.",
  ],
  [
    /TF.IDF|tokeniz|stemming|lemmatiz|natural language/i,
    "Text representation",
    "Tokenization divides text into units. Stemming uses a rule-based reduction and lemmatization seeks a dictionary form in context. A bag of words records token counts while discarding order. TF-IDF reduces the relative weight of terms occurring in many documents. The tokenization and vocabulary must be consistent between training and inference.",
    "'dog bites person' and 'person bites dog' have the same unigram count representation but different meanings. A bag of words cannot recover the missing order. Record preprocessing choices before comparing text models.",
  ],
  [
    /computer graphics|transformation|rotation|scaling|clipping/i,
    "Graphics transformations",
    "A geometric transformation maps coordinates into a new coordinate system. Homogeneous coordinates let translations be represented with matrix multiplication. Composition order matters: rotating then translating generally differs from translating then rotating. Clipping keeps only the part of a primitive inside a defined viewing region.",
    "Rotate point (1, 0) by 90 degrees counterclockwise about the origin to obtain (0, 1), then translate by (2, 0) to obtain (2, 1). Reversing the operations gives (0, 3). State the coordinate convention before constructing the matrix.",
  ],
  [
    /HTML|CSS|web design|responsive/i,
    "Web structure and layout",
    "HTML expresses document structure and meaning; CSS controls presentation and layout. Use semantic controls, associated labels, visible focus and a logical reading order. Responsive design adapts to available space rather than assuming a particular device. A visual label does not replace an accessible programmatic label.",
    "A form label connected to an input identifier names that input for assistive technology. Test the form using a keyboard and a narrow viewport. A clickable div needs extra behavior and semantics that an ordinary button already provides.",
  ],
  [
    /REST|full stack|JavaScript|client.server/i,
    "Web application boundaries",
    "A web application separates presentation, server-side policy and durable data. A client request expresses intent; the server validates input and authorization before changing records. Authentication establishes identity and authorization decides permitted actions. Never rely on a hidden browser control as an access boundary.",
    "A student can construct a request for another student's submission even if the interface hides the link. The API must check ownership or course permission on that request. Use a transaction when saving the submission and its durable job together.",
  ],
  [
    /inheritance|polymorphism|object.oriented|encapsulation/i,
    "Object-oriented design",
    "Encapsulation groups state with controlled operations. Inheritance models a substitutable specialization and polymorphism lets client code use a common interface. Overriding replaces inherited behavior for an instance type; overloading selects among signatures. Sharing code alone does not justify an inheritance relationship.",
    "Rectangle and Triangle can implement an area operation through a Shape interface. Client code calls area without testing the concrete class. If a subclass breaks the promised preconditions or results, the abstraction is not substitutable.",
  ],
  [
    /loop|iteration|while|for statement/i,
    "Iteration",
    "A loop repeats while a condition holds. State the initial condition, the change made on each iteration and the termination argument. A loop invariant explains what remains true as the loop advances. Boundary values often reveal one extra or one missing iteration.",
    "To sum n values, initialize total to 0 and index to 0. Before each iteration, total equals the sum of values before index. Add the current value, increment index, and stop when index equals n. Using <= n attempts to read beyond the last valid index.",
  ],
  [
    /function|recursion|recursive/i,
    "Functions and recursion",
    "A function has a contract describing inputs, outputs and effects. Recursive functions solve a case through smaller cases and need a base case plus a decreasing measure. A return value and a printed side effect are different interfaces. Account for call-stack space when analyzing recursion.",
    "Factorial has base case 0! = 1 and recursive case n! = n*(n-1)! for positive n. The argument decreases by one until the base case. The naive recursive implementation uses a linear-depth call stack; defining negative inputs is a separate contract decision.",
  ],
  [
    /array|list|tuple|dictionary/i,
    "Collections",
    "Collections organize multiple values under a defined access contract. An array supports indexed access; a list interface may have a different representation. A dictionary associates unique keys with values. Choosing a representation requires considering access, insertion, deletion and iteration costs rather than the data type's name alone.",
    "Finding a value in an unsorted array may examine every element, while reading the value at a known valid index is direct. A dictionary lookup uses a key rather than a sequence position. These operations cannot be assigned the same complexity just because each returns a value.",
  ],
  [
    /stack|queue|linked list/i,
    "Linear data structures",
    "A stack removes the most recently inserted item (LIFO); a queue removes the earliest inserted item (FIFO). A linked list connects nodes through links and supports sequential traversal. Empty-state handling and the representation invariants are part of each operation's contract.",
    "Insert A, then B, then C. Removing from a stack returns C first; removing from a queue returns A first. A linked-list traversal follows next links until null. A cycle requires an explicit detection or termination strategy.",
  ],
  [
    /graph|DFS|BFS|spanning/i,
    "Graphs",
    "A graph models vertices and edges. An adjacency matrix provides direct edge lookup with quadratic vertex storage; an adjacency list stores incident neighbors. BFS explores by increasing unweighted distance with a queue; DFS follows a branch using recursion or a stack. A traversal from one start visits only its reachable component.",
    "For edges A-B, A-C and B-D, BFS from A discovers B and C before D. Mark a vertex when it is discovered to prevent repeated enqueueing through multiple incoming paths. Traversal tie order depends on the chosen neighbor order.",
  ],
  [
    /binary search tree|AVL|B.Tree|B\+|trees?/i,
    "Search trees",
    "A search tree orders keys so comparisons guide lookup. A binary search tree can become linear-height after ordered insertions. Balanced trees maintain additional structural invariants to limit height; multiway trees organize several keys per node. A binary tree is not automatically a binary search tree.",
    "Insert 2, then 4, then 6 into an ordinary BST: all links go right and lookup can visit every node. Inorder traversal produces sorted keys only when the BST ordering invariant holds. Rotation-based balancing must preserve that order.",
  ],
  [
    /dynamic programming|knapsack|OBST|matrix chain/i,
    "Dynamic programming",
    "Dynamic programming stores solutions to overlapping subproblems. Define the state, recurrence, base cases and evaluation order before implementing the table. A state must contain enough information for future decisions. Reusing subproblems does not remove the need to justify optimal substructure.",
    "For 0/1 knapsack, define dp[i,c] as the maximum value using the first i items at capacity c. If item i fits, compare skipping it with its value plus dp[i-1,c-weight]. Referring to dp[i,c-weight] instead would permit reusing the item and change the problem.",
  ],
  [
    /finite automata|regular expression|grammar|Turing|computation/i,
    "Formal languages",
    "A formal language is a set of strings over an alphabet. A recognizer decides membership according to its computation model. Finite automata track a finite state; a pushdown automaton adds a stack. A grammar generates strings using productions. The model's expressive power matters when selecting a recognizer.",
    "A DFA for an even number of 1s needs two parity states: reading 1 toggles the state and reading 0 leaves it unchanged. Accept the even state, including the empty string. A state label alone is insufficient without transitions and an initial/accepting-state definition.",
  ],
  [
    /compiler|lexical|syntax|parsing|code generation/i,
    "Compilation",
    "Compilation translates a program through defined representations. Lexical analysis forms tokens; parsing checks their grammatical structure; semantic analysis checks context-dependent rules; code generation maps an intermediate form to a target. Error recovery helps continue analysis but must not silently change program meaning.",
    "In 'x = 2 + 3', a scanner recognizes identifier, assignment, number, plus and number tokens. A parser groups the expression; semantic analysis resolves x and checks types. A syntactically valid expression can still refer to an undeclared variable.",
  ],
  [
    /microcontroller|embedded|Arduino|sensor|Internet of Things|IoT/i,
    "Embedded systems",
    "An embedded system couples computation with a physical environment. Inputs may come from sensors and outputs from actuators. Timing, power, memory and electrical limits are part of the design contract. A software simulation cannot certify that a circuit has been wired safely or behaves correctly under real timing.",
    "A temperature controller reads a sensor, compares against a threshold and drives an actuator. Use hysteresis with separate on/off thresholds to avoid rapid switching around one value. Hardware calibration, pin configuration and real timing need a suitable supervised lab.",
  ],
  [
    /digital electronics|logic gate|flip.flop|boolean|combinational/i,
    "Digital logic",
    "Boolean logic models discrete truth values. Combinational outputs depend on present inputs; sequential circuits also depend on stored state. A truth table states every input-output combination. Propagation delays and timing constraints matter in hardware even when a logical expression is correct.",
    "A half adder has sum A XOR B and carry A AND B. Inputs 1 and 1 produce sum 0 and carry 1. It has no carry-in; combining full adders is needed for a conventional multi-bit addition chain.",
  ],
  [
    /architecture|cache|pipeline|instruction|memory hierarchy/i,
    "Computer architecture",
    "Architecture defines the programmer-visible machine behavior; organization describes implementation choices. A memory hierarchy trades latency, capacity and cost. Caches exploit locality, and a pipeline overlaps different instruction stages. A hazard can prevent ideal overlap even when instructions are independent in appearance.",
    "Reading consecutive array elements often reuses a cache line, showing spatial locality. A later instruction using a value produced by an earlier one can create a data hazard. A five-stage pipeline does not guarantee fivefold throughput for every program.",
  ],
  [
    /cloud|virtualization|distributed/i,
    "Cloud and distributed systems",
    "Virtualization shares physical resources through isolated virtual environments. Distributed systems coordinate nodes over a network with latency and failures. A service model specifies which layers the provider manages. Elastic capacity does not eliminate application-level data consistency, security or cost decisions.",
    "If a request times out after a remote write, the write may still have committed. Retrying without an idempotency mechanism can duplicate the change. State what happens when one node is unreachable before claiming a distributed operation is reliable.",
  ],
  [
    /UI|UX|user persona|wireframe|usability|accessibility/i,
    "Interface design",
    "User experience design starts from users, tasks and context. A persona summarizes evidence about a user group; a wireframe explores structure; a prototype lets users exercise interaction. Evaluate task success and accessibility, not only visual appeal. A persona invented without evidence is a hypothesis to validate.",
    "Ask a participant to find and change a delivery address. Record whether they complete the task, where they hesitate and what the interface tells them. Testing only whether they like the color palette does not establish usable navigation.",
  ],
  [
    /software architecture|design patterns|microservices|MVC/i,
    "Architecture and patterns",
    "An architecture allocates responsibilities and dependencies to satisfy functional and quality needs. A design pattern is a reusable solution structure with a context and tradeoffs. MVC separates model, view and controller responsibilities. Introducing more services or layers can also introduce operational and coordination costs.",
    "For a small teaching app, a modular monolith may keep transactions and deployment simple. Separate a code executor because its isolation requirement is concrete. Choosing microservices solely because they are fashionable does not justify their failure and coordination costs.",
  ],
];
function blockedReason(entry: SourceCoverage) {
  if (
    /SQL|database|Mongo|Cassandra/i.test(entry.subjectTitle + entry.sourceText)
  )
    return "This practical requires a database or SQL/NoSQL tool environment not supported by the four-language isolated execution contract.";
  if (
    /embedded|microcontroller|electronics|IoT|sensor|hardware/i.test(
      entry.subjectTitle + entry.sourceText,
    )
  )
    return "This practical requires physical hardware or an approved circuit/device simulator and supervised evidence review.";
  if (
    /parallel|OpenMP|MPI|CUDA|GPU|cloud|virtual|network|Linux|shell|AWK/i.test(
      entry.sourceText + entry.subjectTitle,
    )
  )
    return "This practical requires networking, operating-system, GPU, parallel or external-tool infrastructure outside the configured coding sandbox.";
  return "This source practical requires external tools, artifacts or supervised assessment. An evidence workflow for that environment is not configured.";
}
export const learningDrafts: LearningDraft[] = [];
learningDrafts.push(...supplementalDrafts);
for (const entry of sourceCoverage.entries.filter(
  (e) => e.scope === "COMPUTING",
)) {
  const notes = conceptNotes.filter(([pattern]) =>
    pattern.test(entry.sourceText),
  );
  const practical = entry.kind === "LAB_ACTIVITY";
  learningDrafts.push({
    key: entry.key,
    title: entry.title.slice(0, 200),
    unitLabel: (entry.unit
      ? `Unit ${entry.unit}: ${entry.title}`
      : "Laboratory / activity reference"
    ).slice(0, 100),
    lesson: `Authored study draft, version 1. This is original explanatory material and is not official syllabus text or faculty-approved content.\n\nObjectives\nIdentify the named concepts, explain their contracts and assumptions, and work through the example below.\n\nAuthored explanations\n${notes.length ? notes.map(([, title, text]) => `${title}\n${text}`).join("\n\n") : "The source identifies this activity but a topic-specific explanation has not yet been authored. Use the official pages and retain this as an incomplete draft."}\n\nWorked examples and misconceptions\n${notes.length ? notes.map(([, title, , example]) => `${title}: ${example}`).join("\n\n") : "A worked example and misconceptions still require topic-specific authoring; none are presented as complete."}\n\nOfficial source paragraph / assignment excerpt (extracted; verify formulas and cross-page continuation against the PDF)\n${entry.sourceText || "No detailed source paragraph was supplied in the imported record."}\n\nProvenance\n${entry.source}, ${entry.subjectCode}, PDF page(s) ${entry.pages.join(", ")}. ${entry.issues.join(" ")}\n\nCoverage limit\nThese notes explain matched concepts only. The full explicit source group and assessments remain incomplete until the coverage checklist is resolved.`,
    objectives: notes.length
      ? notes
          .slice(0, 10)
          .map(
            ([, title]) => `Explain ${title.toLowerCase()} and its assumptions`,
          )
      : ["Resolve source detail and author a topic-specific lesson"],
    visualizerKey: null,
    requiredActivities: practical
      ? ["LESSON", "PRACTICAL"]
      : ["LESSON", "QUIZ"],
    blockedActivities: practical
      ? [{ activity: "PRACTICAL", reason: blockedReason(entry) }]
      : [],
    sourcePages: entry.pages,
    sourceCode: entry.subjectCode,
    sourceUnit: entry.unit,
    sourcePosition: entry.position,
    authoringStatus:
      entry.status === "SOURCE_BLOCKED" ? "SOURCE_BLOCKED" : "INCOMPLETE",
    coverageKeys: [entry.key],
    questions: [],
    problems: [],
  });
}
for (const key of algorithmKeys) {
  const notes = sortNotes[key],
    search = key === "linear-search" || key === "binary-search";
  const mapping = algorithms[key].syllabus;
  const entries = sourceCoverage.entries.filter(
    (e) =>
      e.subjectCode === mapping.subjectCode &&
      e.pages.some((p) => (mapping.pages as readonly number[]).includes(p)),
  );
  const roman = mapping.unit.match(/^Unit ([IVX]+)/)?.[1];
  const unitNumber = roman
    ? ({ I: 1, II: 2, III: 3, IV: 4, V: 5 } as Record<string, number>)[roman]
    : null;
  const entry =
    entries.find((e) =>
      unitNumber ? e.unit === unitNumber : e.kind === "LAB_ACTIVITY",
    ) ?? entries[0];
  const topicNotes = notes
    ? `${notes.explanation}\n\nWorked example\n${notes.example}\n\nMisconception\n${notes.misconception}\n\nCorrectness invariant\n${notes.invariant}.\n\nComplexity\n${algorithms[key].complexity}. Stability: ${notes.stable}.`
    : search
      ? `A search returns the first zero-based matching index, or -1 if the target is absent. Linear search examines candidates in order. Binary search requires sorted input and repeatedly reduces the candidate interval. After finding a matching midpoint, keep its index and continue left to check for an earlier duplicate.\n\nWorked example\nIn [1, 3, 3, 8], target 3 occurs at indices 1 and 2; return 1. With target 2, return -1.\n\nMisconception\nBinary search cannot safely discard half of unsorted input. Finding one duplicate does not prove it is the first.\n\nComplexity\n${algorithms[key].complexity}.`
      : conceptNotes
          .filter(([p]) => p.test(algorithms[key].title))
          .map(
            ([, title, text, example]) =>
              `${title}\n${text}\n\nWorked example and misconception\n${example}`,
          )
          .join("\n\n");
  const assessment = !!notes || search;
  learningDrafts.push({
    key: `draft-${key}`,
    title: algorithms[key].title,
    unitLabel: mapping.unit,
    lesson: `Original authored lesson draft, version 1. Faculty review is required before publication.\n\nObjectives\nTrace the documented operations; explain the invariant and limitations; compare time and storage requirements.\n\nExplanation\n${topicNotes}\n\nPseudocode convention\n${algorithms[key].pseudocode.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nProvenance\n${mapping.source}, ${mapping.subjectCode}, ${mapping.unit}, PDF page(s) ${mapping.pages.join(", ")}. This is explanatory material, not a reproduction of the official assignment. Sequential simulations do not certify parallel, hardware or external-tool labs.`,
    objectives: [
      "Trace the documented operations",
      "Justify correctness using an invariant",
      "Explain time and storage requirements",
    ],
    visualizerKey: key,
    requiredActivities: assessment ? ["LESSON", "QUIZ", "CODING"] : ["LESSON"],
    blockedActivities: [],
    sourcePages: [...mapping.pages],
    sourceCode: mapping.subjectCode,
    sourceUnit: entry?.unit ?? null,
    sourcePosition: entry?.position ?? 1,
    authoringStatus: assessment ? "COMPLETE_DRAFT" : "INCOMPLETE",
    coverageKeys: [],
    questions: assessment ? algorithmQuestions(key) : [],
    problems: assessment ? algorithmProblems(key) : [],
  });
}
