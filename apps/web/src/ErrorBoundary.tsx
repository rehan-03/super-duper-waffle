import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./ui";

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    console.error("AlgoLearn page could not load.");
  }
  render() {
    return this.state.failed ? (
      <main className="card" role="alert">
        <h1>This page could not load</h1>
        <p>
          Your saved work remains in your account. Reload the page to reconnect.
        </p>
        <Button onClick={() => window.location.reload()}>Reload page</Button>
      </main>
    ) : (
      this.props.children
    );
  }
}
