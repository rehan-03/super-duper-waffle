import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { AuthProvider } from "./auth";
import { App } from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import "./styles.css";
function Root() {
  const [reduceMotion, setReduceMotion] = useState(
    () => localStorage.getItem("algolearn-motion") === "reduce",
  );
  useEffect(() => {
    const update = () =>
      setReduceMotion(localStorage.getItem("algolearn-motion") === "reduce");
    window.addEventListener("motion-preference-changed", update);
    return () =>
      window.removeEventListener("motion-preference-changed", update);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.motion = reduceMotion
      ? "reduce"
      : "system";
  }, [reduceMotion]);
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </MotionConfig>
    </ErrorBoundary>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
