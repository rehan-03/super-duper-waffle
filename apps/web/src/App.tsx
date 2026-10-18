import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { motion, AnimatePresence, useScroll, useSpring } from "motion/react";
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Users,
  ShieldCheck,
  Activity,
  LogOut,
  Menu,
  X,
  ChartNoAxesCombined,
  Settings,
  FileClock,
  Trophy,
  Award,
  Map,
  Megaphone,
  Bell,
  HelpCircle,
  ChevronUp,
} from "lucide-react";
import { AuthPage, LocalMailPreviewPage, useAuth } from "./auth";
import { Alert, Button, Empty, Loading } from "./ui";
import {
  DashboardPage,
  CoursesPage,
  CoursePage,
  CurriculumPage,
  SubjectPage,
  ProgressPage,
  UsersPage,
  AdminCoursesPage,
  AuditPage,
  HealthPage,
  AccountPage,
} from "./pages";
import {
  TopicPage,
  QuizPage,
  VisualizerLibraryPage,
  VisualizerPage,
} from "./learning-pages";
import { ContentPage, StudentsPage, StudentDetailPage } from "./faculty-pages";
import type { Role } from "./types";
import CoveragePage from "./CoveragePage";
import {
  LeaderboardPage,
  AchievementsPage,
  RoadmapPage,
  AnnouncementsPage,
  NotificationsPage,
  HelpPage,
  NotFoundPage,
} from "./extra-pages";
const CodingPage = lazy(() => import("./CodingPage"));

/** Scroll progress bar fixed at top of viewport */
function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  return (
    <motion.div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: "#4338ca",
        transformOrigin: "0%",
        scaleX,
        zIndex: 1000,
      }}
      aria-hidden="true"
    />
  );
}

/** Back-to-top floating button */
function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = document.getElementById("main-content");
    if (!el) return;
    const handler = () => setVisible(el.scrollTop > 400 || window.scrollY > 400);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          className="back-to-top"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.2 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to top"
          title="Back to top"
        >
          <ChevronUp size={20} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
function Guard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  return user && roles.includes(user.role) ? (
    children
  ) : (
    <Empty title="Access restricted">
      <p>This page is available to authorized course staff only.</p>
    </Empty>
  );
}
function Shell() {
  const { user, loading, logout } = useAuth(),
    location = useLocation(),
    [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [mobile, setMobile] = useState(
      () => matchMedia("(max-width:767px)").matches,
    ),
    sidebar = useRef<HTMLElement>(null),
    opener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const query = matchMedia("(max-width:767px)");
    const update = () => {
      setMobile(query.matches);
      if (!query.matches) setOpen(false);
    };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    setOpen(false);
    document.querySelector<HTMLElement>("#main-content")?.focus();
  }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const controls = () =>
      Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>("button,a[href]") ?? [],
      ).filter((e) => e.offsetParent !== null);
    controls()[0]?.focus();
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
      if (e.key === "Tab") {
        const items = controls(),
          first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", listener);
    return () => {
      window.removeEventListener("keydown", listener);
      opener.current?.focus();
    };
  }, [open]);
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  const links = [
    { to: "/", label: "Overview", Icon: LayoutDashboard },
    { to: "/courses", label: "My courses", Icon: BookOpen },
    { to: "/visualizers", label: "Visualizer lab", Icon: Activity },
    ...(user.role === "STUDENT"
      ? [{ to: "/progress", label: "Progress", Icon: ChartNoAxesCombined }]
      : [
          {
            to: "/curriculum",
            label: "Curriculum references",
            Icon: GraduationCap,
          },
          { to: "/coverage", label: "Syllabus coverage", Icon: FileClock },
        ]),
    ...(user.role === "ADMIN"
      ? [
          { to: "/admin/users", label: "Users", Icon: Users },
          {
            to: "/admin/courses",
            label: "Courses & enrollment",
            Icon: ShieldCheck,
          },
          { to: "/admin/health", label: "Service health", Icon: Activity },
          { to: "/admin/audit", label: "Audit history", Icon: FileClock },
        ]
      : []),
    { to: "/leaderboard", label: "Leaderboard", Icon: Trophy },
    { to: "/achievements", label: "Achievements", Icon: Award },
    { to: "/roadmap", label: "Roadmap", Icon: Map },
    { to: "/announcements", label: "Announcements", Icon: Megaphone },
    { to: "/notifications", label: "Notifications", Icon: Bell },
    { to: "/help", label: "Help & FAQ", Icon: HelpCircle },
    { to: "/account", label: "Account", Icon: Settings },
  ];
  async function signOut() {
    try {
      await logout();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="app-shell">
      <ScrollProgressBar />
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {open && (
        <button
          aria-label="Close navigation"
          className="nav-scrim"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        ref={sidebar}
        inert={mobile && !open}
        role={mobile && open ? "dialog" : undefined}
        aria-modal={mobile && open ? true : undefined}
        className={`sidebar ${open ? "open" : ""}`}
        aria-label="Primary navigation"
      >
        <div className="sidebar-brand">
          <span className="brand-icon">A</span>
          <strong>AlgoLearn</strong>
          <button
            className="mobile-only"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <span className="workspace-label">
          {user.role === "STUDENT"
            ? "Learning workspace"
            : user.role === "FACULTY"
              ? "Teaching workspace"
              : "Institution workspace"}
        </span>
        <nav>
          {links.map(({ to, label, Icon }) => (
            <NavLink to={to} end={to === "/"} key={to} title={label}>
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="nav-active-pill"
                      transition={{ type: "spring", stiffness: 380, damping: 34 }}
                      aria-hidden="true"
                    />
                  )}
                  <Icon size={19} aria-hidden="true" />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p>
            Learn with clarity.
            <br />
            <span>Progress with purpose.</span>
          </p>
          <button onClick={signOut}>
            <LogOut size={18} aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
      <div className="app-body" inert={mobile && open}>
        <header className="topbar">
          <button
            ref={opener}
            className="mobile-only"
            aria-label="Open navigation"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Menu size={22} />
          </button>
          <span className="topbar-caption">Your curriculum. Connected.</span>
          <div className="profile-chip">
            <div className="avatar" aria-hidden="true">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <strong>{user.name}</strong>
              <small>{user.role.toLowerCase()}</small>
            </div>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {error && <Alert>{error}</Alert>}
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <Suspense fallback={<Loading />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </main>
        <footer>AlgoLearn · Curriculum-integrated learning</footer>
        <BackToTop />
      </div>
    </div>
  );
}
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage key="login" />} />
      <Route path="/signup" element={<AuthPage key="signup" />} />
      <Route path="/activate" element={<AuthPage key="activate" />} />
      <Route path="/dev/mail-preview" element={<LocalMailPreviewPage />} />
      <Route
        path="/forgot-password"
        element={<AuthPage key="forgot-password" />}
      />
      <Route
        path="/reset-password"
        element={<AuthPage key="reset-password" />}
      />
      <Route element={<Shell />}>
        <Route index element={<DashboardPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:courseId" element={<CoursePage />} />
        <Route
          path="coverage"
          element={
            <Guard roles={["FACULTY", "ADMIN"]}>
              <CoveragePage />
            </Guard>
          }
        />
        <Route
          path="courses/:courseId/subjects/:subjectId"
          element={<SubjectPage />}
        />
        <Route
          path="curriculum"
          element={
            <Guard roles={["FACULTY", "ADMIN"]}>
              <CurriculumPage />
            </Guard>
          }
        />
        <Route
          path="curriculum/:subjectId"
          element={
            <Guard roles={["FACULTY", "ADMIN"]}>
              <SubjectPage />
            </Guard>
          }
        />
        <Route
          path="progress"
          element={
            <Guard roles={["STUDENT"]}>
              <ProgressPage />
            </Guard>
          }
        />
        <Route path="topics/:topicId" element={<TopicPage />} />
        <Route path="visualizers" element={<VisualizerLibraryPage />} />
        <Route path="visualizers/:algorithm" element={<VisualizerPage />} />
        <Route path="quizzes/:attemptId" element={<QuizPage />} />
        <Route path="problems/:problemId" element={<CodingPage />} />
        <Route
          path="faculty/courses/:courseId"
          element={
            <Guard roles={["FACULTY", "ADMIN"]}>
              <ContentPage />
            </Guard>
          }
        />
        <Route
          path="faculty/courses/:courseId/students"
          element={
            <Guard roles={["FACULTY", "ADMIN"]}>
              <StudentsPage />
            </Guard>
          }
        />
        <Route
          path="faculty/courses/:courseId/students/:studentId"
          element={
            <Guard roles={["FACULTY", "ADMIN"]}>
              <StudentDetailPage />
            </Guard>
          }
        />
        <Route
          path="admin/users"
          element={
            <Guard roles={["ADMIN"]}>
              <UsersPage />
            </Guard>
          }
        />
        <Route
          path="admin/courses"
          element={
            <Guard roles={["ADMIN"]}>
              <AdminCoursesPage />
            </Guard>
          }
        />
        <Route
          path="admin/audit"
          element={
            <Guard roles={["ADMIN"]}>
              <AuditPage />
            </Guard>
          }
        />
        <Route
          path="admin/health"
          element={
            <Guard roles={["ADMIN"]}>
              <HealthPage />
            </Guard>
          }
        />
        <Route path="account" element={<AccountPage />} />
        {/* ── New pages ── */}
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="achievements" element={<AchievementsPage />} />
        <Route path="roadmap" element={<RoadmapPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
