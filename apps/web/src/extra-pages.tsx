/**
 * extra-pages.tsx
 * Seven new authenticated pages added to AlgoLearn.
 *
 * Pages exported:
 *  - LeaderboardPage      /leaderboard
 *  - AchievementsPage     /achievements
 *  - RoadmapPage          /roadmap
 *  - AnnouncementsPage    /announcements
 *  - NotificationsPage    /notifications
 *  - HelpPage             /help
 *  - NotFoundPage         * (catch-all)
 */

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useSpring, useTransform, animate } from "motion/react";
import {
  Trophy,
  Star,
  Flame,
  BookOpen,
  Code2,
  Zap,
  Bell,
  BellOff,
  CheckCircle2,
  Circle,
  Lock,
  Megaphone,
  MessageSquare,
  Search,
  ChevronDown,
  Award,
  Target,
  TrendingUp,
  Sparkles,
  RotateCcw,
  Home,
} from "lucide-react";
import { Badge, Button, Card, Empty, Header } from "./ui";
import { useAuth } from "./auth";

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

/** Animated counter that counts from 0 to `end` when in view */
function AnimatedCounter({
  end,
  duration = 1.2,
  suffix = "",
}: {
  end: number;
  duration?: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const ctrl = animate(0, end, {
      duration,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      onUpdate(value: number) {
        node.textContent = Math.round(value).toLocaleString() + suffix;
      },
    });
    return () => ctrl.stop();
  }, [inView, end, duration, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

/** Wrapper that fade-slides in when scrolled into view */
function Reveal({
  children,
  delay = 0,
  y = 24,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -60px 0px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// 1. LEADERBOARD PAGE  — unique motion: animated bar chart race
// ---------------------------------------------------------------------------

type LeaderRow = {
  rank: number;
  name: string;
  score: number;
  completedTopics: number;
  masteredTopics: number;
  streak: number;
};

// TODO: Replace with real API data from /api/v1/leaderboard
const MOCK_LEADERS: LeaderRow[] = [
  { rank: 1, name: "Ayesha Rao", score: 9840, completedTopics: 42, masteredTopics: 38, streak: 21 },
  { rank: 2, name: "Dev Patel", score: 9210, completedTopics: 39, masteredTopics: 35, streak: 14 },
  { rank: 3, name: "Mei Lin", score: 8990, completedTopics: 37, masteredTopics: 33, streak: 18 },
  { rank: 4, name: "Carlos Ruiz", score: 8400, completedTopics: 35, masteredTopics: 29, streak: 9 },
  { rank: 5, name: "Priya Sharma", score: 7980, completedTopics: 33, masteredTopics: 28, streak: 11 },
  { rank: 6, name: "Luca Bianchi", score: 7650, completedTopics: 31, masteredTopics: 25, streak: 6 },
  { rank: 7, name: "Jin-Ho Park", score: 7200, completedTopics: 30, masteredTopics: 22, streak: 4 },
  { rank: 8, name: "Sofia Torres", score: 6880, completedTopics: 28, masteredTopics: 20, streak: 7 },
  { rank: 9, name: "Arjun Mehta", score: 6420, completedTopics: 26, masteredTopics: 18, streak: 3 },
  { rank: 10, name: "Hana Yuki", score: 5990, completedTopics: 24, masteredTopics: 15, streak: 5 },
];

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const PERIOD_LABELS = ["All time", "This month", "This week"];

export function LeaderboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState(0);
  const maxScore = MOCK_LEADERS[0]!.score;

  return (
    <>
      {/* ── Hero ── */}
      <motion.div
        className="lb-hero"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="lb-hero-inner">
          <p className="eyebrow">COURSE LEADERBOARD</p>
          <h1 className="lb-title">
            Top performers{" "}
            <motion.span
              className="hero-icon-blob"
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
              aria-hidden="true"
            >
              <Trophy size={28} />
            </motion.span>
          </h1>
          <p className="subtitle">
            Rankings update after each assessed quiz or accepted coding
            submission. Mastery, not just completion, drives the score.
          </p>
        </div>
        <LeaderboardPodium />
      </motion.div>

      {/* ── Period tabs ── */}
      <Reveal delay={0.1}>
        <div className="tabs" role="tablist" aria-label="Leaderboard period">
          {PERIOD_LABELS.map((label, i) => (
            <button
              key={label}
              role="tab"
              aria-selected={period === i}
              onClick={() => setPeriod(i)}
            >
              {label}
            </button>
          ))}
        </div>
      </Reveal>

      {/* ── Stats bar ── */}
      <Reveal delay={0.15}>
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <Card className="stat">
            <span>Participants</span>
            <strong><AnimatedCounter end={247} /></strong>
          </Card>
          <Card className="stat">
            <span>Avg. mastery score</span>
            <strong><AnimatedCounter end={68} suffix="%" /></strong>
          </Card>
          <Card className="stat">
            <span>Quizzes attempted</span>
            <strong><AnimatedCounter end={1832} /></strong>
          </Card>
        </div>
      </Reveal>

      {/* ── Table ── */}
      <Reveal delay={0.2}>
        <Card>
          <div className="table-wrap" style={{ margin: 0, border: 0, borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 48 }}>#</th>
                  <th>Name</th>
                  <th>Score</th>
                  <th style={{ width: 180 }}>Progress</th>
                  <th>Completed</th>
                  <th>Mastered</th>
                  <th>Streak</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_LEADERS.map((row, idx) => {
                  const isMe = user?.name === row.name;
                  return (
                    <motion.tr
                      key={row.rank}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + idx * 0.06, duration: 0.4 }}
                      className={isMe ? "lb-me" : ""}
                      aria-current={isMe ? "true" : undefined}
                    >
                      <td>
                        <span className="lb-rank">{MEDAL[row.rank] ?? row.rank}</span>
                      </td>
                      <td>
                        <div className="lb-name">
                          <div className="avatar" aria-hidden="true">{row.name[0]}</div>
                          {row.name}
                          {isMe && <Badge>You</Badge>}
                        </div>
                      </td>
                      <td><strong>{row.score.toLocaleString()}</strong></td>
                      <td>
                        <div className="lb-bar-track">
                          <motion.div
                            className="lb-bar-fill"
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: row.score / maxScore }}
                            transition={{ delay: 0.3 + idx * 0.06, duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                            style={{ transformOrigin: "left" }}
                          />
                        </div>
                      </td>
                      <td>{row.completedTopics}</td>
                      <td>{row.masteredTopics}</td>
                      <td>
                        <span className="lb-streak">
                          <Flame size={13} aria-hidden="true" />
                          {row.streak}d
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ marginTop: 16, fontSize: 12 }}>
            TODO: Connect to <code>/api/v1/leaderboard</code> with period and courseId query params.
          </p>
        </Card>
      </Reveal>
    </>
  );
}

function LeaderboardPodium() {
  const bars = [
    { height: 60, x: 34, label: "2nd" },
    { height: 90, x: 94, label: "1st" },
    { height: 45, x: 154, label: "3rd" },
  ];
  return (
    <svg
      className="lb-podium-svg"
      viewBox="0 0 220 110"
      aria-label="Podium illustration"
      role="img"
    >
      {bars.map((b, i) => (
        <motion.rect
          key={b.label}
          x={b.x}
          y={110 - b.height}
          width={26}
          height={b.height}
          rx={5}
          fill={i === 1 ? "#4338ca" : i === 0 ? "#818cf8" : "#a5b4fc"}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.3 + i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          style={{ transformOrigin: `${b.x + 13}px 110px` }}
        />
      ))}
      {bars.map((b, i) => (
        <motion.text
          key={`t-${b.label}`}
          x={b.x + 13}
          y={110 - b.height - 6}
          textAnchor="middle"
          fontSize="14"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 + i * 0.12, duration: 0.4 }}
        >
          {i === 1 ? "🥇" : i === 0 ? "🥈" : "🥉"}
        </motion.text>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 2. ACHIEVEMENTS PAGE  — unique motion: pop-in badge grid + XP ring
// ---------------------------------------------------------------------------

type Achievement = {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  unlocked: boolean;
  xp: number;
  category: "learning" | "assessment" | "streak" | "social";
};

// TODO: Replace with real API data from /api/v1/achievements
const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: "first-lesson", icon: <BookOpen size={22} />, title: "First Step", description: "Complete your first lesson", unlocked: true, xp: 50, category: "learning" },
  { id: "quiz-pass", icon: <CheckCircle2 size={22} />, title: "Quiz Cleared", description: "Pass a quiz with 80%+ (mastery)", unlocked: true, xp: 100, category: "assessment" },
  { id: "streak-7", icon: <Flame size={22} />, title: "Week Warrior", description: "Maintain a 7-day learning streak", unlocked: true, xp: 150, category: "streak" },
  { id: "algo-explorer", icon: <Code2 size={22} />, title: "Algorithm Explorer", description: "Run 5 different visualizer simulations", unlocked: true, xp: 120, category: "learning" },
  { id: "perfect-quiz", icon: <Star size={22} />, title: "Perfect Score", description: "Score 100% on any quiz attempt", unlocked: false, xp: 200, category: "assessment" },
  { id: "code-accepted", icon: <Zap size={22} />, title: "Code Accepted", description: "Get a coding submission accepted on first try", unlocked: false, xp: 250, category: "assessment" },
  { id: "streak-30", icon: <Flame size={22} />, title: "Month Master", description: "Maintain a 30-day learning streak", unlocked: false, xp: 500, category: "streak" },
  { id: "all-topics", icon: <Target size={22} />, title: "Course Completer", description: "Complete all topics in a course", unlocked: false, xp: 1000, category: "learning" },
  { id: "top-10", icon: <TrendingUp size={22} />, title: "Rising Star", description: "Reach the top 10 on the leaderboard", unlocked: false, xp: 300, category: "social" },
  { id: "three-courses", icon: <Award size={22} />, title: "Multi-Course Scholar", description: "Enroll and complete 3 separate courses", unlocked: false, xp: 800, category: "learning" },
  { id: "fast-finish", icon: <Sparkles size={22} />, title: "Speed Learner", description: "Complete a topic in under 10 minutes", unlocked: false, xp: 175, category: "learning" },
  { id: "retake-master", icon: <RotateCcw size={22} />, title: "Persistence Pays", description: "Pass a quiz after 3+ failed attempts", unlocked: false, xp: 220, category: "assessment" },
];

const CATEGORY_LABELS: Record<Achievement["category"], string> = {
  learning: "Learning",
  assessment: "Assessment",
  streak: "Streaks",
  social: "Social",
};

export function AchievementsPage() {
  const [filter, setFilter] = useState<Achievement["category"] | "all">("all");
  const unlockedCount = ALL_ACHIEVEMENTS.filter((a) => a.unlocked).length;
  const totalXp = ALL_ACHIEVEMENTS.filter((a) => a.unlocked).reduce((s, a) => s + a.xp, 0);

  const visible = filter === "all"
    ? ALL_ACHIEVEMENTS
    : ALL_ACHIEVEMENTS.filter((a) => a.category === filter);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Header
          eyebrow="YOUR MILESTONES"
          title="Achievements"
          description="Unlock badges by learning, assessing, and streaking your way to mastery."
        />
      </motion.div>

      {/* ── XP ring + stats ── */}
      <Reveal delay={0.1}>
        <div className="ach-hero-row">
          <XpRing unlocked={unlockedCount} total={ALL_ACHIEVEMENTS.length} />
          <div className="stats-grid ach-stats" style={{ flex: 1 }}>
            <Card className="stat">
              <span>Unlocked</span>
              <strong><AnimatedCounter end={unlockedCount} /> / {ALL_ACHIEVEMENTS.length}</strong>
            </Card>
            <Card className="stat">
              <span>Total XP earned</span>
              <strong><AnimatedCounter end={totalXp} suffix=" XP" /></strong>
            </Card>
            <Card className="stat">
              <span>Next milestone</span>
              <strong style={{ fontSize: 16 }}>{ALL_ACHIEVEMENTS.find((a) => !a.unlocked)?.title ?? "All done!"}</strong>
            </Card>
          </div>
        </div>
      </Reveal>

      {/* ── Filter tabs ── */}
      <Reveal delay={0.15}>
        <div className="tabs" role="tablist" aria-label="Achievement category">
          {(["all", "learning", "assessment", "streak", "social"] as const).map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={filter === cat}
              onClick={() => setFilter(cat)}
            >
              {cat === "all" ? "All" : CATEGORY_LABELS[cat as Achievement["category"]]}
            </button>
          ))}
        </div>
      </Reveal>

      {/* ── Badge grid ── */}
      <div className="ach-grid">
        {visible.map((ach, i) => (
          <motion.div
            key={ach.id}
            className={`ach-card ${ach.unlocked ? "ach-unlocked" : "ach-locked"}`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.18 + i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            whileHover={ach.unlocked ? { y: -4, boxShadow: "0 10px 30px #4338ca18" } : {}}
          >
            <div className={`ach-icon ${ach.unlocked ? "" : "ach-icon-locked"}`} aria-hidden="true">
              {ach.unlocked ? ach.icon : <Lock size={22} />}
              {ach.unlocked && <div className="ach-shimmer" aria-hidden="true" />}
            </div>
            <div>
              <p className="ach-title">{ach.title}</p>
              <p className="ach-desc">{ach.description}</p>
              <Badge>{ach.xp} XP</Badge>
            </div>
          </motion.div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        TODO: Fetch from <code>/api/v1/achievements</code> with real unlock status per user.
      </p>
    </>
  );
}

function XpRing({ unlocked, total }: { unlocked: number; total: number }) {
  const fraction = unlocked / total;
  const r = 42;
  const circ = 2 * Math.PI * r;
  const ref = useRef<SVGCircleElement>(null);
  const inView = useInView(ref as unknown as React.RefObject<Element>, { once: true });
  const progress = useSpring(0, { stiffness: 80, damping: 18 });
  const dashoffset = useTransform(progress, (v) => circ - v * circ);

  useEffect(() => {
    if (inView) progress.set(fraction);
  }, [inView, fraction, progress]);

  return (
    <div className="xp-ring-wrap" aria-label={`${unlocked} of ${total} achievements unlocked`}>
      <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="9" />
        <motion.circle
          ref={ref}
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#4338ca"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circ}
          style={{ strokeDashoffset: dashoffset, rotate: -90, transformOrigin: "50px 50px" }}
        />
      </svg>
      <div className="xp-ring-label">
        <strong>{unlocked}</strong>
        <small>/{total}</small>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. ROADMAP PAGE  — unique motion: alternating node slide-in
// ---------------------------------------------------------------------------

type RoadmapNode = {
  id: string;
  title: string;
  unit: string;
  status: "done" | "active" | "locked";
  xp: number;
};

// TODO: Replace with real progression from /api/v1/roadmap/:courseId
const ROADMAP_NODES: RoadmapNode[] = [
  { id: "n1", title: "Introduction to Computing", unit: "Unit 1", status: "done", xp: 100 },
  { id: "n2", title: "Programming Fundamentals", unit: "Unit 2", status: "done", xp: 150 },
  { id: "n3", title: "Data Structures: Arrays & Lists", unit: "Unit 3", status: "done", xp: 200 },
  { id: "n4", title: "Stacks, Queues & Deques", unit: "Unit 4", status: "active", xp: 200 },
  { id: "n5", title: "Trees & Binary Search Trees", unit: "Unit 5", status: "locked", xp: 250 },
  { id: "n6", title: "Graph Algorithms", unit: "Unit 6", status: "locked", xp: 300 },
  { id: "n7", title: "Sorting Algorithms", unit: "Unit 7", status: "locked", xp: 250 },
  { id: "n8", title: "Algorithm Complexity & Analysis", unit: "Unit 8", status: "locked", xp: 300 },
];

export function RoadmapPage() {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Header
          eyebrow="YOUR LEARNING PATH"
          title="Course roadmap"
          description="A step-by-step visual guide through your curriculum. Each node unlocks when its prerequisites are complete."
        />
      </motion.div>

      <Reveal delay={0.1}>
        <div className="stats-grid" style={{ marginBottom: 32 }}>
          <Card className="stat">
            <span>Completed</span>
            <strong><AnimatedCounter end={3} /> nodes</strong>
          </Card>
          <Card className="stat">
            <span>In progress</span>
            <strong>1 node</strong>
          </Card>
          <Card className="stat">
            <span>Locked</span>
            <strong>{ROADMAP_NODES.filter((n) => n.status === "locked").length} nodes</strong>
          </Card>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <Card>
          <h2 style={{ marginBottom: 32 }}>Learning path</h2>
          <div className="roadmap-track">
            {ROADMAP_NODES.map((node, i) => {
              const isLeft = i % 2 === 0;
              return (
                <motion.div
                  key={node.id}
                  className={`roadmap-node-row ${isLeft ? "roadmap-left" : "roadmap-right"}`}
                  initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "0px 0px -40px 0px" }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                >
                  <div className="roadmap-line-stub" />
                  <motion.div
                    className="roadmap-dot-wrap"
                    whileHover={node.status !== "locked" ? { scale: 1.15 } : {}}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <RoadmapDot status={node.status} size={40} />
                  </motion.div>
                  <div className={`roadmap-card roadmap-card-${node.status}`}>
                    <p className="eyebrow" style={{ margin: 0 }}>{node.unit}</p>
                    <p style={{ margin: "4px 0 0", fontWeight: 600, fontSize: 15 }}>{node.title}</p>
                    <div className="row" style={{ marginTop: 8, gap: 8 }}>
                      <Badge>{node.xp} XP</Badge>
                      {node.status === "active" && (
                        <Link to="/courses" className="text-action" style={{ fontSize: 13 }}>Continue →</Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 24 }}>
            TODO: Fetch from <code>/api/v1/roadmap/:courseId</code> to show real topic sequence.
          </p>
        </Card>
      </Reveal>

      <Reveal delay={0.25}>
        <div className="row" style={{ gap: 20, marginTop: 16 }}>
          {(["done", "active", "locked"] as const).map((s) => (
            <div key={s} className="row" style={{ gap: 8 }}>
              <RoadmapDot status={s} size={14} />
              <span style={{ fontSize: 13, color: "#526078", textTransform: "capitalize" }}>{s}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </>
  );
}

function RoadmapDot({ status, size = 20 }: { status: RoadmapNode["status"]; size?: number }) {
  const color = status === "done" ? "#0f766e" : status === "active" ? "#4338ca" : "#94a3b8";
  return (
    <div
      style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      aria-hidden="true"
    >
      {status === "done" && <CheckCircle2 size={size * 0.65} color="white" />}
      {status === "active" && <Circle size={size * 0.65} color="white" />}
      {status === "locked" && <Lock size={size * 0.55} color="white" />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. ANNOUNCEMENTS PAGE  — unique motion: staggered card slide-in
// ---------------------------------------------------------------------------

type Announcement = {
  id: string;
  title: string;
  body: string;
  author: string;
  role: "FACULTY" | "ADMIN";
  date: string;
  pinned: boolean;
  course?: string;
};

// TODO: Replace with real API data from /api/v1/announcements
const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "a1",
    title: "Semester quiz schedule released",
    body: "All quizzes for Semester 3 DSA topics are now published. You can access them via the Topics panel in your course. Remember that quiz retries use different question families each time. TODO: fetch from /api/v1/announcements.",
    author: "Dr. R. Sharma",
    role: "FACULTY",
    date: "2026-10-15",
    pinned: true,
    course: "CS301 · Data Structures",
  },
  {
    id: "a2",
    title: "Platform maintenance window — 18 Oct 02:00–04:00 IST",
    body: "The AlgoLearn platform will undergo scheduled maintenance. Coding submissions and quiz progress will be unavailable during this window. Any drafts saved before 01:45 IST are safe.",
    author: "Platform Admin",
    role: "ADMIN",
    date: "2026-10-13",
    pinned: true,
    course: undefined,
  },
  {
    id: "a3",
    title: "Graph algorithm visualizers updated",
    body: "BFS and DFS visualizers now include step-by-step transcript explanations. Visit the Visualizer Lab to try them. Source syllabus mappings for Unit 6 have also been verified.",
    author: "Prof. A. Kumar",
    role: "FACULTY",
    date: "2026-10-10",
    pinned: false,
    course: "CS301 · Data Structures",
  },
  {
    id: "a4",
    title: "New coding problems added for Sorting Unit",
    body: "Two new reviewed coding problems — Merge Sort Implementation and Quick Sort Partition — are now live in your CS301 course. Each problem has 3 sample test cases and 5 hidden cases.",
    author: "Dr. R. Sharma",
    role: "FACULTY",
    date: "2026-10-07",
    pinned: false,
    course: "CS301 · Data Structures",
  },
];

export function AnnouncementsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "pinned">("all");
  const visible = filter === "pinned"
    ? MOCK_ANNOUNCEMENTS.filter((a) => a.pinned)
    : MOCK_ANNOUNCEMENTS;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Header
          eyebrow="COURSE UPDATES"
          title="Announcements"
          description="Messages from your faculty and institution about courses, quizzes, and platform updates."
          action={
            user?.role !== "STUDENT" ? (
              <Button kind="primary">
                <Megaphone size={16} aria-hidden="true" />
                Post announcement
              </Button>
            ) : undefined
          }
        />
      </motion.div>

      <Reveal delay={0.08}>
        <div className="tabs" role="tablist" aria-label="Filter announcements">
          <button role="tab" aria-selected={filter === "all"} onClick={() => setFilter("all")}>All</button>
          <button role="tab" aria-selected={filter === "pinned"} onClick={() => setFilter("pinned")}>📌 Pinned</button>
        </div>
      </Reveal>

      <div style={{ display: "grid", gap: 4 }}>
        {visible.map((ann, i) => (
          <motion.div
            key={ann.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + i * 0.08, duration: 0.45 }}
          >
            <Card className={ann.pinned ? "ann-pinned" : ""}>
              <div className="row spread" style={{ marginBottom: 8 }}>
                <div className="row" style={{ gap: 8 }}>
                  {ann.pinned && <span className="ann-pin-badge">📌 Pinned</span>}
                  <Badge>{ann.role === "ADMIN" ? "Platform" : "Faculty"}</Badge>
                  {ann.course && <Badge>{ann.course}</Badge>}
                </div>
                <time className="muted" style={{ fontSize: 12 }}>
                  {new Date(ann.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </time>
              </div>
              <h3 style={{ margin: "0 0 8px" }}>{ann.title}</h3>
              <p style={{ color: "#526078", fontSize: 14 }}>{ann.body}</p>
              <div className="row" style={{ gap: 6, marginTop: 4 }}>
                <div className="avatar" style={{ width: 26, height: 26, fontSize: 12 }} aria-hidden="true">
                  {ann.author[0]}
                </div>
                <small className="muted">Posted by {ann.author}</small>
              </div>
            </Card>
          </motion.div>
        ))}
        {!visible.length && (
          <Empty title="No announcements">
            <p>No {filter === "pinned" ? "pinned " : ""}announcements at the moment.</p>
          </Empty>
        )}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        TODO: Connect to <code>/api/v1/announcements</code> with read/unread tracking.
      </p>
    </>
  );
}

// ---------------------------------------------------------------------------
// 5. NOTIFICATIONS PAGE  — unique motion: gradient blob background + stagger
// ---------------------------------------------------------------------------

type NotifItem = {
  id: string;
  icon: ReactNode;
  title: string;
  body: string;
  time: string;
  read: boolean;
  link?: string;
};

// TODO: Replace with real API data from /api/v1/notifications
const MOCK_NOTIFS: NotifItem[] = [
  { id: "n1", icon: <CheckCircle2 size={18} />, title: "Quiz graded", body: "Your attempt on \"Sorting Algorithms\" has been scored: 86% — Mastered.", time: "2 hours ago", read: false, link: "/progress" },
  { id: "n2", icon: <Megaphone size={18} />, title: "New announcement", body: "Dr. R. Sharma posted: \"Semester quiz schedule released\"", time: "1 day ago", read: false, link: "/announcements" },
  { id: "n3", icon: <Code2 size={18} />, title: "Code submission accepted", body: "Your Merge Sort solution passed all 8 test cases!", time: "2 days ago", read: true, link: "/courses" },
  { id: "n4", icon: <BookOpen size={18} />, title: "New topic published", body: "\"Graph Traversal — BFS and DFS\" is now available in CS301.", time: "3 days ago", read: true, link: "/courses" },
  { id: "n5", icon: <Star size={18} />, title: "Achievement unlocked", body: "You earned the \"Algorithm Explorer\" badge (+120 XP)!", time: "5 days ago", read: true, link: "/achievements" },
  { id: "n6", icon: <Flame size={18} />, title: "Streak reminder", body: "You're on a 7-day streak! Keep it going today.", time: "6 days ago", read: true },
];

export function NotificationsPage() {
  const [items, setItems] = useState(MOCK_NOTIFS);
  const unread = items.filter((n) => !n.read).length;

  function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <>
      {/* Gradient blob background — unique motion for this page */}
      <div className="notif-blob-bg" aria-hidden="true">
        <motion.div
          className="blob blob-1"
          animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
        />
        <motion.div
          className="blob blob-2"
          animate={{ x: [0, -20, 0], y: [0, 30, 0], scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 10, ease: "easeInOut", delay: 2 }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ position: "relative" }}
      >
        <Header
          eyebrow="ACTIVITY FEED"
          title="Notifications"
          description="Real-time updates from your courses, quizzes, achievements, and faculty."
          action={
            unread > 0 ? (
              <Button kind="secondary" onClick={markAllRead}>
                <BellOff size={16} aria-hidden="true" />
                Mark all read
              </Button>
            ) : undefined
          }
        />
      </motion.div>

      {unread > 0 && (
        <Reveal delay={0.1}>
          <div className="notice" style={{ marginBottom: 20 }}>
            <Bell size={15} aria-hidden="true" style={{ verticalAlign: "middle", marginRight: 6 }} />
            You have <strong>{unread}</strong> unread notification{unread > 1 ? "s" : ""}.
          </div>
        </Reveal>
      )}

      <div style={{ display: "grid", gap: 12, position: "relative" }}>
        {items.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.06, duration: 0.4 }}
          >
            {n.link ? (
              <Link to={n.link} style={{ textDecoration: "none" }}>
                <NotifRow item={n} />
              </Link>
            ) : (
              <NotifRow item={n} />
            )}
          </motion.div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
        TODO: Connect to <code>/api/v1/notifications</code> with SSE or polling for real-time updates.
      </p>
    </>
  );
}

function NotifRow({ item }: { item: NotifItem }) {
  return (
    <div className={`notif-row ${item.read ? "notif-read" : "notif-unread"}`}>
      <div className={`notif-icon ${item.read ? "" : "notif-icon-active"}`} aria-hidden="true">
        {item.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: item.read ? 500 : 700, fontSize: 14 }}>{item.title}</p>
        <p className="muted" style={{ margin: "2px 0 0", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.body}</p>
      </div>
      <time className="muted" style={{ fontSize: 12, flexShrink: 0 }}>{item.time}</time>
      {!item.read && <div className="notif-dot" aria-label="Unread" />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. HELP / FAQ PAGE  — unique motion: SVG path draw on load + accordion
// ---------------------------------------------------------------------------

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

// TODO: Expand with real platform documentation
const FAQ_ITEMS: FaqItem[] = [
  { id: "f1", category: "Learning", question: "How is my topic completion measured?", answer: "A topic is completed when you finish every declared activity — lesson reading, quiz (if required), and coding problem (if required). The checklist on the Topic page shows exactly which activities remain. Mastery is a separate estimate derived from quiz performance across distinct question families." },
  { id: "f2", category: "Learning", question: "Why can't I start a coding problem?", answer: "Coding problems require an isolated execution provider. If the provider is unavailable, the problem will show a 'Provider unavailable' status. This is an infrastructure gate, not a reflection of your ability. You can still read the problem specification and prepare your solution." },
  { id: "f3", category: "Quizzes", question: "Can I retake a quiz?", answer: "Yes. Each retry selects questions from unused question families first, so retries expose you to different material. Your best score per attempt is recorded. The adaptive system looks at your last 5 completed attempts across up to 20 distinct families to estimate mastery." },
  { id: "f4", category: "Quizzes", question: "What do the mastery levels mean?", answer: "Scores below 60% are Weak, 60–79% are Developing, and 80%+ are Mastered. These are statistical estimates based on your quiz history, not definitive assessments. You need at least 10 answered question families before mastery is considered reliable." },
  { id: "f5", category: "Account", question: "How do I change my password?", answer: "Visit Account in the sidebar. You can update your password at any time. Active sessions are not automatically revoked after a password change; log out manually on other devices if needed." },
  { id: "f6", category: "Account", question: "Who enrolls me in a course?", answer: "Course administrators manage all enrollment. Students cannot self-enroll. If you believe you should be enrolled in a course, contact your institution's course administrator." },
  { id: "f7", category: "Visualizers", question: "Are visualizer simulations graded?", answer: "No. Visualizer simulations are optional exploration tools and never create mastery records or contribute to topic completion. They are deterministic, keyboard-accessible, and reduced-motion aware." },
  { id: "f8", category: "Visualizers", question: "Which algorithms are available?", answer: "AlgoLearn includes 13+ deterministic simulations covering linear structures (arrays, linked lists, stacks, queues), tree traversals (BST, AVL), graph algorithms (BFS, DFS, Dijkstra), and sorting (bubble, merge, quick, heap). All are mapped to your official syllabus." },
];

const FAQ_CATEGORIES = Array.from(new Set(FAQ_ITEMS.map((f) => f.category)));

export function HelpPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [category, setCategory] = useState("All");

  const filtered = FAQ_ITEMS.filter((f) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
    const matchesCat = category === "All" || f.category === category;
    return matchesSearch && matchesCat;
  });

  function handleKey(e: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((prev) => (prev === id ? null : id));
    }
  }

  return (
    <>
      {/* ── Hero with SVG path draw ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="help-hero"
      >
        <div style={{ flex: 1 }}>
          <p className="eyebrow">KNOWLEDGE BASE</p>
          <h1>Help &amp; FAQ</h1>
          <p className="subtitle">Everything you need to get the most out of AlgoLearn.</p>
          <div className="help-search" style={{ marginTop: 20 }}>
            <Search size={18} aria-hidden="true" className="help-search-icon" />
            <input
              type="search"
              placeholder="Search questions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search frequently asked questions"
              style={{ paddingLeft: 44 }}
            />
          </div>
        </div>
        <HelpSvgDraw />
      </motion.div>

      {/* ── Category tabs ── */}
      <Reveal delay={0.1}>
        <div className="tabs" role="tablist" aria-label="FAQ category">
          {["All", ...FAQ_CATEGORIES].map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={category === cat}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </Reveal>

      {/* ── FAQ accordion ── */}
      <div className="faq-list">
        {filtered.length === 0 && (
          <Empty title="No results">
            <p>Try a different search term or browse all categories.</p>
          </Empty>
        )}
        {filtered.map((faq, i) => (
          <motion.div
            key={faq.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
            className="faq-item"
          >
            <button
              className="faq-q"
              aria-expanded={open === faq.id}
              onClick={() => setOpen((prev) => (prev === faq.id ? null : faq.id))}
              onKeyDown={(e) => handleKey(e, faq.id)}
            >
              <span className="faq-cat-badge">{faq.category}</span>
              <span style={{ flex: 1, textAlign: "left" }}>{faq.question}</span>
              <motion.span
                animate={{ rotate: open === faq.id ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                aria-hidden="true"
              >
                <ChevronDown size={18} />
              </motion.span>
            </button>
            <motion.div
              className="faq-answer"
              initial={false}
              animate={open === faq.id ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              style={{ overflow: "hidden" }}
            >
              <p style={{ padding: "16px 20px", margin: 0, color: "#526078", fontSize: 14, lineHeight: 1.7 }}>
                {faq.answer}
              </p>
            </motion.div>
          </motion.div>
        ))}
      </div>

      <Reveal delay={0.25}>
        <div style={{ marginTop: 24 }}><Card>
          <div className="row" style={{ gap: 12 }}>
            <MessageSquare size={24} color="#4338ca" aria-hidden="true" />
            <div>
              <h3 style={{ margin: 0 }}>Still have questions?</h3>
              <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
                Contact your faculty or institution administrator directly.
                {/* TODO: Add support ticket link when /api/v1/support is implemented */}
              </p>
            </div>
          </div>
        </Card></div>
      </Reveal>
    </>
  );
}

function HelpSvgDraw() {
  return (
    <svg
      className="help-svg"
      viewBox="0 0 180 160"
      fill="none"
      aria-label="Help illustration"
      role="img"
    >
      <motion.path
        d="M90 20 C90 20 115 20 115 50 C115 70 95 72 90 90"
        stroke="#4338ca"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeInOut", delay: 0.3 }}
      />
      <motion.circle
        cx="90"
        cy="115"
        r="5"
        fill="#4338ca"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 1.4 }}
      />
      <motion.circle
        cx="90"
        cy="80"
        r="65"
        stroke="#e0e7ff"
        strokeWidth="3"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut", delay: 0.1 }}
      />
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const cx = 90 + 65 * Math.cos(rad);
        const cy = 80 + 65 * Math.sin(rad);
        return (
          <motion.circle
            key={deg}
            cx={cx}
            cy={cy}
            r="4"
            fill="#818cf8"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.5 + i * 0.08, duration: 0.3 }}
          />
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 7. NOT FOUND (404) PAGE  — unique motion: floating orbiting planets
// ---------------------------------------------------------------------------

export function NotFoundPage() {
  return (
    <div className="notfound-wrap">
      <NotFoundOrbit />
      <motion.div
        className="notfound-content"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <p className="eyebrow">ERROR 404</p>
        <h1>Page not found</h1>
        <p className="subtitle" style={{ maxWidth: 420 }}>
          This page doesn't exist in the curriculum. Use the navigation to return to your workspace.
        </p>
        <div className="row" style={{ marginTop: 24, gap: 12 }}>
          <Button kind="primary" onClick={() => history.back()}>
            Go back
          </Button>
          <Link to="/" className="button secondary">
            <Home size={16} aria-hidden="true" />
            Dashboard
          </Link>
        </div>
        <div className="notfound-links">
          <p className="muted" style={{ fontSize: 14 }}>Quick links:</p>
          <div className="row" style={{ gap: 10 }}>
            <Link to="/courses" className="topic-chip">Courses</Link>
            <Link to="/visualizers" className="topic-chip">Visualizer lab</Link>
            <Link to="/help" className="topic-chip">Help</Link>
            <Link to="/leaderboard" className="topic-chip">Leaderboard</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function NotFoundOrbit() {
  return (
    <div className="notfound-orbit" aria-hidden="true">
      <svg viewBox="0 0 300 300" width="300" height="300">
        <ellipse cx="150" cy="150" rx="120" ry="50" stroke="#e0e7ff" strokeWidth="1.5" fill="none" />
        <ellipse cx="150" cy="150" rx="80" ry="35" stroke="#c7d2fe" strokeWidth="1.5" fill="none" transform="rotate(40 150 150)" />
        <motion.circle
          cx="150"
          cy="150"
          r="22"
          fill="#4338ca"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
        />
        <text x="150" y="157" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">?</text>
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
          style={{ transformOrigin: "150px 150px" }}
        >
          <circle cx="270" cy="150" r="10" fill="#818cf8" />
        </motion.g>
        <motion.g
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 7, ease: "linear" }}
          style={{ transformOrigin: "150px 150px" }}
        >
          <circle cx="225" cy="115" r="7" fill="#a5b4fc" />
        </motion.g>
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 9, ease: "linear", delay: 1 }}
          style={{ transformOrigin: "150px 150px" }}
        >
          <circle cx="30" cy="150" r="5" fill="#6366f1" />
        </motion.g>
      </svg>
    </div>
  );
}
