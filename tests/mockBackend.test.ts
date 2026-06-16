import { afterEach, describe, expect, it, vi } from "vitest";

import { installMockBackend, json } from "../src/index";
import type { MockBackend } from "../src/index";

let mock: MockBackend | undefined;

afterEach(() => {
  mock?.uninstall();
  mock = undefined;
});

/** Probe the boot endpoint and return its status. */
async function meStatus(): Promise<number> {
  const res = await window.fetch("/api/auth/me");
  return res.status;
}

describe("scenarios → /api/auth/me", () => {
  it("loggedOut → 401", async () => {
    mock = installMockBackend({ scenario: "loggedOut" });
    expect(await meStatus()).toBe(401);
  });

  it("loggedInVerified → 200 with emailVerified:true", async () => {
    mock = installMockBackend({ scenario: "loggedInVerified" });
    const res = await window.fetch("/api/auth/me");
    expect(res.status).toBe(200);
    expect((await res.json()).user.emailVerified).toBe(true);
  });

  it("loggedInPending → 200 with emailVerified:false", async () => {
    mock = installMockBackend({ scenario: "loggedInPending" });
    const res = await window.fetch("/api/auth/me");
    expect(res.status).toBe(200);
    expect((await res.json()).user.emailVerified).toBe(false);
  });

  it("serverError → 500", async () => {
    mock = installMockBackend({ scenario: "serverError" });
    expect(await meStatus()).toBe(500);
  });

  it("defaults to the loggedOut scenario", async () => {
    mock = installMockBackend();
    expect(await meStatus()).toBe(401);
  });
});

describe("setScenario", () => {
  it("switches the response live", async () => {
    mock = installMockBackend({ scenario: "loggedOut" });
    expect(await meStatus()).toBe(401);

    mock.setScenario("loggedInVerified");
    expect(await meStatus()).toBe(200);

    mock.setScenario("loggedOut");
    expect(await meStatus()).toBe(401);
  });

  it("throws on an unknown scenario", () => {
    mock = installMockBackend();
    expect(() => mock!.setScenario("does-not-exist")).toThrow();
  });
});

describe("passthrough", () => {
  it("sends non-/api requests to the original fetch", async () => {
    const original = vi.fn(async () => new Response("cdn"));
    window.fetch = original as unknown as typeof fetch;
    mock = installMockBackend({ scenario: "loggedOut" });

    const res = await window.fetch("https://esm.sh/some-pkg");
    expect(await res.text()).toBe("cdn");
    expect(original).toHaveBeenCalledTimes(1);

    // /api/* is mocked, so the original fetch is NOT called again.
    await window.fetch("/api/auth/me");
    expect(original).toHaveBeenCalledTimes(1);
  });
});

describe("auth flow", () => {
  it("runs login → me → logout end-to-end on in-memory state", async () => {
    mock = installMockBackend({ scenario: "loggedOut" });
    expect(await meStatus()).toBe(401);

    const login = await window.fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "alice@agentaily.com", password: "secret" }),
    });
    expect(login.status).toBe(200);
    expect((await login.json()).user.email).toBe("alice@agentaily.com");

    const me = await window.fetch("/api/auth/me");
    expect(me.status).toBe(200);
    expect((await me.json()).user.email).toBe("alice@agentaily.com");

    const logout = await window.fetch("/api/auth/logout", { method: "POST" });
    expect(logout.status).toBe(200);

    expect(await meStatus()).toBe(401);
  });

  it("register opens a session with an unverified user", async () => {
    mock = installMockBackend({ scenario: "loggedOut" });
    const reg = await window.fetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "bob@agentaily.com", password: "secret" }),
    });
    expect(reg.status).toBe(201);
    expect((await reg.json()).user.emailVerified).toBe(false);

    // verify-email flips the live user to verified
    await window.fetch("/api/auth/verify-email", { method: "POST" });
    const me = await window.fetch("/api/auth/me");
    expect((await me.json()).user.emailVerified).toBe(true);
  });
});

describe("registerHandlers", () => {
  it("serves product-specific routes", async () => {
    mock = installMockBackend({ scenario: "loggedInVerified" });
    mock.registerHandlers([{ path: "/api/widgets", handler: () => json([{ id: 1 }]) }]);

    const res = await window.fetch("/api/widgets");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 1 }]);
  });

  it("returns 404 for an unmatched /api path", async () => {
    mock = installMockBackend();
    const res = await window.fetch("/api/does-not-exist");
    expect(res.status).toBe(404);
  });
});

describe("config.user override", () => {
  it("overrides the seeded user's fields", async () => {
    mock = installMockBackend({
      scenario: "loggedInVerified",
      user: { email: "ceo@agentaily.com" },
    });
    const res = await window.fetch("/api/auth/me");
    expect((await res.json()).user.email).toBe("ceo@agentaily.com");
  });
});

describe("latency", () => {
  it("delays the mocked response by the configured latency", async () => {
    mock = installMockBackend({ scenario: "loggedOut", latency: 60 });
    const start = Date.now();
    const res = await window.fetch("/api/auth/me");
    expect(res.status).toBe(401);
    expect(Date.now() - start).toBeGreaterThanOrEqual(45);
  });
});

describe("uninstall", () => {
  it("restores the original window.fetch", () => {
    const before = window.fetch;
    mock = installMockBackend();
    expect(window.fetch).not.toBe(before);
    mock.uninstall();
    expect(window.fetch).toBe(before);
    mock = undefined;
  });
});

describe("fidelity: a consumer's bare fetch", () => {
  it("intercepts bare fetch('/api/...') (not just window.fetch)", async () => {
    mock = installMockBackend({ scenario: "loggedOut" });
    // Real guard code calls bare `fetch`, which must resolve to the patched binding.
    const res = await fetch("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
