import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { api, setCsrf, HttpError, useData } from "./api";
import type { User } from "./types";
import {
  Alert,
  Badge,
  Button,
  Card,
  Empty,
  ErrorState,
  Field,
  Loading,
} from "./ui";
type Auth = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};
const demoPassword = "AlgoLearn-demo-2026";
const demoAccounts = [
  { role: "Student", email: "student@demo.algolearn.local" },
  { role: "Faculty", email: "faculty@demo.algolearn.local" },
  { role: "Administrator", email: "admin@demo.algolearn.local" },
] as const;
function fillDemoCredentials(form: HTMLFormElement | null, email: string) {
  const emailInput = form?.elements.namedItem("email"),
    passwordInput = form?.elements.namedItem("password");
  if (emailInput instanceof HTMLInputElement) emailInput.value = email;
  if (passwordInput instanceof HTMLInputElement) {
    passwordInput.value = demoPassword;
    passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
  }
}
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
    [localPreview, setLocalPreview] = useState(false),
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
    setLocalPreview(false);
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
        setLocalPreview(r.delivery === "local-preview");
      } else if (reset) {
        const r = await api<{ message: string; delivery: string }>(
          "/auth/password-reset",
          { email },
        );
        setMessage(r.message);
        setLocalPreview(r.delivery === "local-preview");
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
          {mode === "login" && import.meta.env.DEV && (
            <section className="demo-credentials" aria-labelledby="demo-title">
              <div>
                <strong id="demo-title">Local demo accounts</strong>
                <span>Development only</span>
              </div>
              <p>
                Password: <code>{demoPassword}</code>
              </p>
              <div className="demo-account-list">
                {demoAccounts.map((account) => (
                  <button
                    type="button"
                    key={account.role}
                    onClick={(event) =>
                      fillDemoCredentials(
                        event.currentTarget.form,
                        account.email,
                      )
                    }
                  >
                    <strong>{account.role}</strong>
                    <span>{account.email}</span>
                  </button>
                ))}
              </div>
              <small>Select a role to fill the login form.</small>
            </section>
          )}
          {error && <Alert>{error}</Alert>}
          {message ? (
            <div className="notice" role="status">
              {message}
              {localPreview && (
                <p>
                  Development delivery is enabled. No external email was sent.
                  Use the loopback-only local email preview on this computer.
                </p>
              )}
              {localPreview && (
                <p>
                  <Link to="/dev/mail-preview">Open local email preview</Link>
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
type LocalMail = {
  to: string;
  purpose: "ACTIVATION" | "RESET";
  subject: string;
  createdAt: string;
  actionUrl: string;
};
export function LocalMailPreviewPage() {
  const { data, error, loading, refresh } = useData<{
      messages: LocalMail[];
    }>("/dev/mail-preview"),
    [filter, setFilter] = useState("");
  useEffect(() => {
    if (error) return;
    const timer = window.setInterval(refresh, 2000);
    return () => window.clearInterval(timer);
  }, [error, refresh]);
  const messages = (data?.messages ?? []).filter((message) =>
    message.to.toLowerCase().includes(filter.trim().toLowerCase()),
  );
  return (
    <main className="auth-layout">
      <div className="auth-art">
        <Link to="/login" className="brand">
          <span className="brand-icon">A</span> AlgoLearn
        </Link>
        <div>
          <p className="eyebrow">SAFE LOCAL DELIVERY</p>
          <h2>
            Verify locally.
            <br />
            Keep tokens
            <br />
            <span>private.</span>
          </h2>
          <p>
            Preview development messages without exposing server filesystem
            paths in the browser.
          </p>
        </div>
        <small>Loopback development access only</small>
      </div>
      <div className="auth-form-wrap">
        <section className="mail-preview" aria-labelledby="mail-preview-title">
          <BadgeMark />
          <p className="eyebrow">DEVELOPMENT ONLY</p>
          <h1 id="mail-preview-title">Local email preview</h1>
          <p className="subtitle">
            Activation and password-reset messages generated on this loopback
            development server appear here. This page is disabled in production.
          </p>
          <div className="row spread">
            <Link to="/login">Return to log in</Link>
            <Button kind="secondary" type="button" onClick={refresh}>
              Refresh
            </Button>
          </div>
          <Field label="Filter by recipient">
            <input
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              autoComplete="off"
            />
          </Field>
          {error ? (
            <ErrorState error={error} retry={refresh} />
          ) : loading && !data ? (
            <Loading />
          ) : messages.length === 0 ? (
            <Empty title="No matching messages">
              <p>
                Submit signup or password reset, then wait a moment or refresh.
              </p>
            </Empty>
          ) : (
            <div className="card-stack" aria-live="polite">
              {messages.map((message) => (
                <Card
                  key={`${message.createdAt}-${message.to}-${message.purpose}`}
                  className="mail-preview-card"
                >
                  <div className="row spread">
                    <Badge>
                      {message.purpose === "ACTIVATION"
                        ? "Activation"
                        : "Password reset"}
                    </Badge>
                    <time dateTime={message.createdAt}>
                      {new Date(message.createdAt).toLocaleString()}
                    </time>
                  </div>
                  <h2>{message.subject}</h2>
                  <p>{message.to}</p>
                  <a className="button primary" href={message.actionUrl}>
                    Open{" "}
                    {message.purpose === "ACTIVATION" ? "activation" : "reset"}{" "}
                    link
                  </a>
                </Card>
              ))}
            </div>
          )}
        </section>
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
