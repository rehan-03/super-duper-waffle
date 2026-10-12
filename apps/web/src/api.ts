import { useCallback, useEffect, useState } from "react";
let csrfToken = "";
export function setCsrf(value: string) {
  csrfToken = value;
}
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  body?: unknown,
  method = body === undefined ? "GET" : "POST",
): Promise<T> {
  const response = await fetch("/api/v1" + path, {
    method,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data: {
    code?: string;
    message?: string;
    fieldErrors?: Record<string, string[]>;
  };
  try {
    data = response.status === 204 ? {} : await response.json();
    if (data === null || typeof data !== "object")
      throw new Error("Invalid response");
  } catch {
    throw new HttpError(
      response.status,
      "INVALID_RESPONSE",
      "The service returned an unreadable response. Please retry.",
    );
  }
  if (!response.ok) {
    if (response.status === 401)
      window.dispatchEvent(new Event("session-expired"));
    throw new HttpError(
      response.status,
      data.code ?? "REQUEST_FAILED",
      data.message ?? "Unable to complete this request.",
      data.fieldErrors,
    );
  }
  return data as T;
}
export function useData<T>(path: string | null) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    path: string | null;
    version: number;
    data: T | null;
    error: Error | null;
    loading: boolean;
  }>({ path, version, data: null, error: null, loading: !!path });
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    setResult({ path, version, data: null, error: null, loading: !!path });
    if (!path) return;
    api<T>(path)
      .then((v) => {
        if (active)
          setResult({ path, version, data: v, error: null, loading: false });
      })
      .catch((e) => {
        if (active)
          setResult({ path, version, data: null, error: e, loading: false });
      });
    return () => {
      active = false;
    };
  }, [path, version]);
  const current =
    result.path === path && result.version === version
      ? result
      : { data: null, error: null, loading: !!path };
  return {
    data: current.data,
    error: current.error,
    loading: current.loading,
    refresh,
  };
}
