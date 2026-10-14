import type { LearningDraft } from "./draft-library.js";
const requirementsRows: [string, string, string[], string][] = [
  [
    "What is the purpose of requirements elicitation?",
    "Understand stakeholder needs and constraints",
    [
      "Choose fonts before identifying users",
      "Replace validation with implementation",
      "Guarantee immediate agreement",
    ],
    "Elicitation gathers needs and context before proposing a solution.",
  ],
  [
    "Who is a stakeholder?",
    "A person or group affected by or influencing the system",
    ["Only programmers", "Only paying customers", "Only users who can log in"],
    "Operators, administrators and affected groups can also be stakeholders.",
  ],
  [
    "Which artifact describes an actor pursuing a goal through system interaction?",
    "A use case",
    ["A compiler token", "A CPU register", "A color palette"],
    "A use case describes goal-directed interaction and its outcomes.",
  ],
  [
    "Which is a functional requirement?",
    "An enrolled student can resume an unfinished quiz",
    [
      "The system should feel modern",
      "The logo uses blue",
      "The repository contains many files",
    ],
    "Resuming a quiz is observable application behavior.",
  ],
  [
    "What is a use-case precondition?",
    "A condition required before interaction begins",
    [
      "Every internal function call",
      "The success outcome",
      "A possible interface color",
    ],
    "Authentication and enrollment may be preconditions for course activities.",
  ],
  [
    "What does requirements validation check?",
    "Requirements describe intended needs clearly and consistently",
    [
      "Every software defect has been eliminated",
      "A mockup is automatically approved",
      "Implementation choices are irreversible",
    ],
    "Validation checks needs, clarity, consistency and feasibility with stakeholders.",
  ],
  [
    "A requirement says 'the page must be fast'. What should happen next?",
    "Agree on a measurable response target and workload",
    [
      "Assume one millisecond",
      "Delete the requirement",
      "Hide delays with animation",
    ],
    "A testable quality requirement needs a threshold, conditions and measurement method.",
  ],
  [
    "Borrowers want unlimited loans; librarians require a limit. What should negotiation do?",
    "Agree on and document a reasoned tradeoff",
    [
      "Accept whichever request arrived last",
      "Hide the conflict",
      "Treat a programmer preference as official policy",
    ],
    "Negotiation resolves conflicting needs through explicit reasoning and agreement.",
  ],
  [
    "A borrowing use case describes only success. What should be added for unavailable copies?",
    "An alternative flow and observable outcome",
    [
      "Only an unrelated class diagram",
      "A fabricated successful loan",
      "An assumption all requests succeed",
    ],
    "Alternative flows describe conditions that interrupt or alter the main scenario.",
  ],
  [
    "Students may view quiz results. Which ambiguity affects authorization?",
    "Whether access is restricted to their own results",
    ["The result font", "Source-file count", "Whether developers like quizzes"],
    "A role permission must also specify ownership boundaries.",
  ],
  [
    "Interviews give different meanings of 'active account'. What work product helps?",
    "A shared glossary and explicit account-state rules",
    [
      "A silent hard-coded interpretation",
      "A larger icon",
      "Duplicate rows for each definition",
    ],
    "A common vocabulary reduces inconsistent models and acceptance criteria.",
  ],
  [
    "A requirement mandates a database technology without rationale. What should be clarified?",
    "Whether it is a real constraint or an unnecessary design choice",
    [
      "Stakeholders can never mandate technology",
      "Every requirement must name a library",
      "Data integrity is irrelevant",
    ],
    "Institutional policy can justify technology constraints; record the rationale.",
  ],
  [
    "A scenario assumes a signed-in user. Where should that assumption be recorded?",
    "In preconditions or a referenced authentication scenario",
    ["Only in developer memory", "As its success outcome", "As a CSS class"],
    "Explicit assumptions make scenario dependencies reviewable.",
  ],
  [
    "Which test validates 'withdrawals never make balances negative'?",
    "Request more than the balance and verify rejection with unchanged balance",
    [
      "Check a button exists",
      "Measure the logo",
      "Test only a smaller withdrawal",
    ],
    "Test both the response and state when the policy boundary is violated.",
  ],
  [
    "Written requirements are consistent, but users cannot complete their real task. What follows?",
    "Internal consistency does not establish validity for the user need",
    [
      "Consistency proves usefulness",
      "Users provide no evidence",
      "Changing the font must resolve it",
    ],
    "Consistency and fitness for stakeholder needs are distinct checks.",
  ],
  [
    "A requirement changes after implementation. What traceability links need review?",
    "Related models, design, tests and affected behavior",
    [
      "Only the document title",
      "Only unrelated screenshots",
      "None after coding",
    ],
    "Traceability supports impact analysis as requirements change.",
  ],
  [
    "An approved use case has contradictory success and alternative outcomes. What remains necessary?",
    "Resolve the contradiction before relying on approval",
    [
      "Treat a signature as proof of consistency",
      "Erase the alternative without discussion",
      "Ignore the guarantee in tests",
    ],
    "Approval records a review; it does not replace logical consistency checks.",
  ],
  [
    "A draft invents a daily transfer limit without source or stakeholder support. Its status is what?",
    "An explicit proposal requiring stakeholder decision",
    [
      "Official policy",
      "Verified source requirement",
      "Learner assessment evidence",
    ],
    "Authored proposals must be separated from authoritative rules.",
  ],
  [
    "A response-time requirement has a threshold but no concurrency. What is missing?",
    "The workload and operating conditions",
    ["A larger heading", "A different password", "Use-case paragraph count"],
    "A threshold without conditions has incompatible possible interpretations.",
  ],
  [
    "Engineering details make a vague requirement testable. What safeguard is needed?",
    "Validate the observable contract with affected stakeholders",
    [
      "Treat all defaults as stakeholder decisions",
      "Automatically approve related work",
      "Remove the original need",
    ],
    "Improving testability must not silently change the intended outcome.",
  ],
];
export const supplementalDrafts: LearningDraft[] = [
  {
    key: "draft-requirements-validation",
    title: "Requirements validation and use cases",
    unitLabel: "Unit II: Requirements Engineering and Analysis",
    sourceCode: "2301213",
    sourceUnit: 2,
    sourcePosition: 1,
    sourcePages: [44],
    visualizerKey: null,
    requiredActivities: ["LESSON", "QUIZ"],
    blockedActivities: [],
    authoringStatus: "COMPLETE_DRAFT",
    coverageKeys: [],
    problems: [],
    objectives: [
      "Identify stakeholders and conflicting viewpoints",
      "Describe main and alternative use-case flows",
      "Validate clear, consistent and testable requirements",
    ],
    lesson:
      "Original authored lesson draft, version 1. Human faculty review is required.\n\nExplanation\nRequirements engineering discovers what a system must accomplish and its operating constraints. Identify stakeholders, their goals and existing context. Interviews, observation and collaborative discussion provide different evidence; record assumptions and conflicts. Stakeholders include affected or influential groups such as operators and administrators.\n\nRepresent a user goal with a use case: actor, goal, preconditions, main interaction, alternatives and success or failure outcomes. Describe observable interaction rather than internal function calls. Keep a shared glossary for terms such as active account. A requirements model can combine scenarios, data concepts and behavioral rules.\n\nNegotiate conflicting needs by discussing constraints and documenting an agreed tradeoff. Validate necessity, clarity, consistency, feasibility and testability. Functional requirements specify behavior. Quality requirements specify constraints such as response time under a stated workload. Trace requirements to models, implementation and acceptance tests for impact analysis. Engineering proposals are not automatically institutional policy.\n\nWorked example\nA library borrowing use case has actor Borrower, goal Obtain an available book, and preconditions authenticated borrower and eligible account. The main flow selects a copy, checks eligibility, creates a loan and confirms its due date. Alternatives include no available copy and an existing loan limit. Stakeholders must decide limits and due-date policy; developers must record proposals as proposals. An acceptance criterion verifies that a refused loan leaves loan count and copy availability unchanged.\n\nMisconceptions\nA mockup alone does not define policy. 'Fast' needs a threshold and operating conditions. Internal consistency does not prove fitness for the user's task. Approval records review of specific material; edits require renewed review.\n\nProvenance\nsy-2023.pdf, 2301213 Software Engineering, Unit II, PDF page 44 explicitly includes stakeholders, viewpoints, elicitation, scenarios, use cases, modeling, negotiation and validation. This explanation is authored material; other Unit II details remain on the separate coverage checklist.",
    questions: requirementsRows.map(
      ([prompt, answer, wrong, explanation], i) => {
        const options = [answer, ...wrong],
          offset = i % 4;
        return {
          objective: "Validate requirements and model use cases",
          difficulty: i < 6 ? "EASY" : i < 13 ? "MEDIUM" : "HARD",
          prompt,
          options: [...options.slice(offset), ...options.slice(0, offset)],
          correctOption: (4 - offset) % 4,
          explanation,
        };
      },
    ),
  },
  {
    key: "draft-sql-joins-practical",
    title: "SQL joins: instructor and student lab",
    unitLabel: "SQL Joins laboratory assignment",
    sourceCode: "2301304",
    sourceUnit: null,
    sourcePosition: 1,
    sourcePages: [10],
    visualizerKey: null,
    requiredActivities: ["LESSON", "PRACTICAL"],
    blockedActivities: [
      {
        activity: "PRACTICAL",
        reason:
          "This SQL laboratory requires an isolated relational database and a faculty-reviewed practical evidence workflow. The four-language coding sandbox cannot execute or certify it.",
      },
    ],
    authoringStatus: "COMPLETE_DRAFT",
    coverageKeys: [],
    questions: [],
    problems: [],
    objectives: [
      "Distinguish inner and outer join behavior",
      "Retain unmatched students and instructors when required",
      "Explain grouped counts and view definitions",
    ],
    lesson:
      "Original authored practical lesson draft, version 1. Human faculty review is required.\n\nExplanation\nThe supplied assignment models students and instructors. Match Student.instructorid with Instructor.instructorid. An inner join keeps matched pairs; a left join starting from students also keeps students without matching instructors, with null instructor fields. A full outer join keeps unmatched rows from both sides. For DBMSs without a direct full outer join, an equivalent formulation must preserve unmatched rows and correct duplicate multiplicities. Confirm the dialect first.\n\nWorked example\nStudents are (1, Ana, 10), (2, Ben, NULL); instructors are (10, Isha, Pune, computer), (20, Dev, Nashik, mathematics). The inner join pairs Ana with Isha. A student-left join also returns Ben with missing instructor fields. A full outer join additionally returns Dev with missing student fields. Find unmatched students by testing the missing matched instructor key after a left join. To find both kinds of unmatched row, use the corresponding full-join unmatched-key condition. A final WHERE specialization='computer' removes null-specialization rows; place predicates deliberately.\n\nAssignment reasoning\nThe source asks for each student's instructor, unmatched students, unmatched rows on both sides, students whose instructors specialize in computer, and a view counting students with instructors in Pune. Count matched students selected through the instructor-city predicate. COUNT(studentid) counts existing identifiers; COUNT(*) can include a null-extended placeholder in an outer join. A view stores a query definition rather than a permanently frozen result. Check fixtures with matches, unmatched rows and repeated instructors.\n\nMisconceptions\nNULL is not an empty string or zero. A WHERE predicate on the nullable side can remove the unmatched outer-join rows. Check row multiplicities as well as names. A written explanation or saved draft does not establish that a database practical ran.\n\nProvenance\n1781009701_ty-2023-pattern-computer-engineering-merged (1).pdf, 2301304 Database Management System Lab, SQL Joins assignment, PDF page 10. Examples are original teaching fixtures. Database execution and practical evidence remain explicitly blocked.",
  },
];
