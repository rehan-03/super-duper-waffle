import { afterEach, expect, test, vi } from "vitest";
import { api, HttpError } from "../../apps/web/src/api";

afterEach(() => vi.unstubAllGlobals());

test("non-JSON upstream failures produce a retryable message without exposing response bodies", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response("<html>upstream failure</html>", { status: 502 }),
      ),
  );
  await expect(api("/me")).rejects.toMatchObject({
    status: 502,
    code: "INVALID_RESPONSE",
    message: "The service returned an unreadable response. Please retry.",
  });
});

test("structured API errors preserve validation fields and successful responses are returned", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          {
            code: "VALIDATION",
            message: "Check fields",
            fieldErrors: { email: ["Invalid email"] },
          },
          { status: 422 },
        ),
      ),
  );
  await expect(api("/auth/signup", {})).rejects.toBeInstanceOf(HttpError);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ status: "ok" })),
  );
  await expect(api("/health")).resolves.toEqual({ status: "ok" });
});
