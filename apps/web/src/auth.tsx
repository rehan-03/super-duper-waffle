import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { api, setCsrf, HttpError } from "./api";
import type { User } from "./types";
import { Alert, Button, Field, Loading } from "./ui";
type Auth = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};
const context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const expired = () => {
      setUser(null);
      setCsrf("");
    };
    window.addEventListener("session-expired", expired);
    api<{ user: User; csrfToken: string }>("/me")
      .then((d) => {
        setUser(d.user);
        setCsrf(d.csrfToken);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  const login = async (email: string, password: string) => {
    const d = await api<{ user: User; csrfToken: string }>("/auth/login", {
      email,
      password,
    });
    setUser(d.user);
    setCsrf(d.csrfToken);
  };
  const logout = async () => {
    await api("/auth/logout", {});
    setUser(null);
    setCsrf("");
  };
  return (
    <context.Provider value={{ user, loading, login, logout }}>
      {children}
    </context.Provider>
  );
}
export function useAuth() {
  return useContext(context)!;
}
export function AuthPage() {
  const { user, login } = useAuth(),
    navigate = useNavigate(),
    location = useLocation();
  const mode = location.pathname.slice(1),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [developmentOutbox, setDevelopmentOutbox] = useState(false),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "",
  );
  useEffect(() => {
    if (window.location.hash)
      history.replaceState(null, "", window.location.pathname);
    setError("");
    setMessage("");
    setDevelopmentOutbox(false);
  }, [mode]);
  if (user && (mode === "login" || mode === "signup"))
    return <Navigate to="/" replace />;
  const activation = mode === "activate",
    confirm = mode === "reset-password",
    reset = mode === "forgot-password",
    signup = mode === "signup";
  const title = activation
    ? "Welcome to AlgoLearn"
    : confirm
      ? "Choose a new password"
      : reset
        ? "Reset your password"
        : signup
          ? "Create your student account"
          : "Welcome back";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const email = String(form.get("email") ?? "").trim(),
        password = String(form.get("password") ?? "");
      if (activation || confirm) {
        if (password !== form.get("confirmation"))
          throw new Error("Passwords do not match.");
        await api(
          activation ? "/auth/activate" : "/auth/password-reset/confirm",
          { token, password },
        );
        setMessage(
          activation
            ? "Account activated. You can now sign in."
            : "Password changed. You can now sign in.",
        );
      } else if (signup) {
        const r = await api<{ message: string; delivery: string }>(
          "/auth/signup",
          {
            name: String(form.get("name") ?? "").trim(),
            email,
          },
        );
        setMessage(r.message);
        setDevelopmentOutbox(r.delivery === "development-outbox");
      } else if (reset) {
        const r = await api<{ message: string }>("/auth/password-reset", {
          email,
        });
        setMessage(r.message);
      } else {
        await login(email, password);
        navigate("/");
      }
    } catch (e) {
      setError(
        e instanceof HttpError && e.fieldErrors
          ? Object.values(e.fieldErrors).flat().join(" ")
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-layout">
      <div className="auth-art">
        <Link to="/login" className="brand">
          <span className="brand-icon">A</span> AlgoLearn
        </Link>
        <div>
          <p className="eyebrow">UNDERSTAND. PRACTICE. PROGRESS.</p>
          <h2>
            Make every
            <br />
            learning step
            <br />
            <span>meaningful.</span>
          </h2>
          <p>
            Explore algorithms, connect them to your curriculum, and build your
            skills with clarity.
          </p>
        </div>
        <small>Curriculum-integrated learning · K.K. Wagh</small>
      </div>
      <div className="auth-form-wrap">
        <form onSubmit={submit} className="auth-form">
          <BadgeMark />
          {(mode === "login" || signup) && (
            <nav className="auth-options" aria-label="Account access">
              <Link
                to="/login"
                aria-current={mode === "login" ? "page" : undefined}
              >
                Log in
              </Link>
              <Link to="/signup" aria-current={signup ? "page" : undefined}>
                Sign up
              </Link>
            </nav>
          )}
          <h1>{title}</h1>
          <p className="subtitle">
            {activation
              ? "Verify your account and choose a secure password."
              : confirm
                ? "Use at least 12 characters."
                : reset
                  ? "We’ll send a link if an active account exists."
                  : signup
                    ? "Enter your details. Your activation link lets you verify your email and choose a password."
                    : "Log in to your learning workspace."}
          </p>
          {error && <Alert>{error}</Alert>}
          {message ? (
            <div className="notice" role="status">
              {message}
              {developmentOutbox && (
                <p>
                  Local email delivery is enabled. Open your activation link
                  from the private <code>C:\vs code\PBL1\.local\outbox</code>{" "}
                  folder on this computer. No email is sent to your inbox in
                  this mode.
                </p>
              )}
              <p>
                <Link to="/login">Return to log in</Link>
              </p>
            </div>
          ) : (
            <>
              {signup && (
                <Field label="Full name">
                  <input
                    name="name"
                    autoComplete="name"
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </Field>
              )}
              {!(activation || confirm) && (
                <Field label="Email">
                  <input
                    type="email"
                    name="email"
                    autoComplete={signup ? "email" : "username"}
                    maxLength={254}
                    required
                  />
                </Field>
              )}
              {!reset && !signup && (
                <Field
                  label={confirm || activation ? "New password" : "Password"}
                  hint={
                    activation || confirm
                      ? "At least 12 characters; passphrases work well."
                      : undefined
                  }
                >
                  <div className="password-row">
                    <input
                      type={show ? "text" : "password"}
                      name="password"
                      autoComplete={
                        activation || confirm
                          ? "new-password"
                          : "current-password"
                      }
                      minLength={activation || confirm ? 12 : 1}
                      maxLength={128}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      aria-label={show ? "Hide password" : "Show password"}
                    >
                      {show ? "Hide" : "Show"}
                    </button>
                  </div>
                </Field>
              )}
              {(activation || confirm) && (
                <Field label="Confirm password">
                  <input
                    name="confirmation"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    required
                  />
                </Field>
              )}
              <Button disabled={busy || ((activation || confirm) && !token)}>
                {busy
                  ? "Please wait…"
                  : activation
                    ? "Activate account"
                    : confirm
                      ? "Update password"
                      : reset
                        ? "Send reset link"
                        : signup
                          ? "Sign up"
                          : "Log in"}
              </Button>
              {(activation || confirm) && !token && (
                <Alert>Open your activation or password reset link.</Alert>
              )}
            </>
          )}
          {mode === "login" && (
            <Link to="/forgot-password">Forgot password?</Link>
          )}
          <p className="auth-note">
            Students can sign up here. Faculty and administrator accounts, and
            course enrollment, are managed by your institution.
          </p>
        </form>
      </div>
    </main>
  );
}
function BadgeMark() {
  return (
    <span className="auth-mark" aria-hidden="true">
      ↗
    </span>
  );
}
