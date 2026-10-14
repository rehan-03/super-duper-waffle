export type Role = "STUDENT" | "FACULTY" | "ADMIN";
export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: "PENDING" | "ACTIVE" | "DEACTIVATED";
};
export type Progress = {
  score: number | null;
  evidenceCount: number;
  state: string;
  completed: boolean;
  lessonAcknowledged: boolean;
  quizSubmitted: boolean;
  codingAccepted: boolean;
  requiredActivities: string[];
  blockedActivities: { activity: string; reason: string }[];
};
export type Topic = {
  id: string;
  key: string;
  title: string;
  unitLabel: string;
  position: number;
  lesson: string;
  objectives: string[];
  prerequisiteKeys: string[];
  reviewed: boolean;
  reviewerId: string | null;
  reviewedAt: string | null;
  version: number;
  visualizerKey: string | null;
  requiredActivities: string[];
  blockedActivities: { activity: string; reason: string }[];
  sourceTopicIds: string[];
  authoringStatus: string;
  coverageKeys: string[];
  sourceSubjectId: string;
  sourceUnitId: string | null;
  sourcePages: number[];
  sourceSubject?: Subject;
  revision: { number: number; courseId: string; status: string };
  progress?: Progress;
};
export type Course = {
  id: string;
  code: string;
  title: string;
  term: string;
  status: "ACTIVE" | "ARCHIVED";
  publishedRevisionId: string | null;
  subjects?: { subject: Subject }[];
};
export type Subject = {
  id: string;
  code: string;
  observedCode: string;
  title: string;
  pathway: string;
  startPage: number;
  endPage: number;
  issues: string[];
  source: { filename: string; sha256?: string };
  academicYear: { number: number; label: string };
  semester: { number: number; label: string } | null;
  units?: {
    id: string;
    number: number;
    title: string;
    sourcePages: number[];
    topics: { id: string; text: string }[];
  }[];
  sourceReferences?: { sourcePage: { number: number; text: string } }[];
};
export type Dashboard = {
  courses: { course: Course; topics: (Topic & { progress: Progress })[] }[];
  stats: {
    enrolledCourses: number;
    publishedTopics: number;
    completedTopics: number;
    assessedTopics: number;
  };
  recommendations: {
    topicId: string;
    courseId: string;
    title: string;
    reason: string;
    action: string;
  }[];
};
export type Quiz = {
  id: string;
  topicId: string;
  title: string;
  status: string;
  score: number | null;
  createdAt: string;
  submittedAt: string | null;
  progress?: Progress;
  recommendations?: {
    topicId: string;
    title: string;
    reason: string;
    action: string;
  }[];
  items: {
    id: string;
    position: number;
    selectedOption: number | null;
    version: number;
    question: { prompt: string; options: string[] };
    correctOption?: number;
    isCorrect?: boolean;
    explanation?: string;
  }[];
};
export type Problem = {
  id: string;
  title: string;
  statement: string;
  starterCodes: Record<string, string>;
  topicId: string;
  courseId: string;
  revision: number;
  samples: {
    id: string;
    position: number;
    input: string;
    expectedOutput: string;
  }[];
};
export type Submission = {
  id: string;
  problemId: string;
  language: string;
  mode: string;
  source: string;
  status: string;
  verdict: string | null;
  passedCount: number;
  totalCount: number;
  createdAt: string;
  cases?: {
    position: number;
    hidden: boolean;
    verdict: string | null;
    output?: string | null;
    diagnostics?: string | null;
    time?: string;
    memory?: number;
  }[];
};
export type Question = {
  version: number;
  reviewerId: string | null;
  reviewedAt: string | null;
  id: string;
  objective: string;
  difficulty: string;
  prompt: string;
  options: string[];
  correctOption: number;
  explanation: string;
  reviewed: boolean;
};
export type AuthorProblem = Problem & {
  version: number;
  reviewerId: string | null;
  reviewedAt: string | null;
  reviewed: boolean;
  tests: { input: string; expectedOutput: string; hidden: boolean }[];
};
export type Revision = {
  _count: { topics: number };
  id: string;
  number: number;
  status: string;
  topics: (Topic & { questions: Question[]; problems: AuthorProblem[] })[];
};
