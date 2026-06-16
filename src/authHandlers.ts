// Shared auth handlers. The response shapes hand-mirror the real Cloudflare
// Worker's /api/auth/* routes so the prototype's client-side auth code runs
// unchanged against the mock.
//
// TODO: extract `@agentaily/api-contract` so the real Worker + design-kit share
// one source of truth for these request/response shapes and can't drift.

import { json } from "./http";
import { MOCK_SESSION_TOKEN } from "./scenarios";
import type { HandlerRoute, MockUser } from "./types";

function newUser(email: string, emailVerified: boolean): MockUser {
  return { id: "u_mock", email, emailVerified };
}

async function emailFromBody(req: { json: () => Promise<unknown> }): Promise<string> {
  const body = (await req.json()) as { email?: unknown } | undefined;
  return typeof body?.email === "string" ? body.email : "user@agentaily.com";
}

/** The built-in auth routes, checked after any product-registered routes. */
export const authHandlers: HandlerRoute[] = [
  // GET /api/auth/me — the guard's boot probe. 200 with the user when there's a
  // session, else 401. This is what every scenario's logged-in/out state drives.
  {
    path: "/api/auth/me",
    method: "GET",
    handler: (_req, ctx) => {
      if (ctx.state.token && ctx.state.user) {
        return json({ user: ctx.state.user });
      }
      return json({ error: "unauthorized" }, { status: 401 });
    },
  },
  // POST /api/auth/login — opens a session for a (verified) user.
  {
    path: "/api/auth/login",
    method: "POST",
    handler: async (req, ctx) => {
      const email = await emailFromBody(req);
      ctx.state.token = MOCK_SESSION_TOKEN;
      ctx.state.user = newUser(email, true);
      return json({ user: ctx.state.user, token: ctx.state.token });
    },
  },
  // POST /api/auth/logout — clears the session.
  {
    path: "/api/auth/logout",
    method: "POST",
    handler: (_req, ctx) => {
      ctx.state.token = null;
      ctx.state.user = null;
      return json({ ok: true });
    },
  },
  // POST /api/auth/register — creates an unverified user and opens a session
  // (mirrors "registered, now verify your email").
  {
    path: "/api/auth/register",
    method: "POST",
    handler: async (req, ctx) => {
      const email = await emailFromBody(req);
      ctx.state.token = MOCK_SESSION_TOKEN;
      ctx.state.user = newUser(email, false);
      return json({ user: ctx.state.user }, { status: 201 });
    },
  },
  // POST /api/auth/verify-email — flips the current user to verified.
  {
    path: "/api/auth/verify-email",
    method: "POST",
    handler: (_req, ctx) => {
      if (ctx.state.user) {
        ctx.state.user = { ...ctx.state.user, emailVerified: true };
      }
      return json({ user: ctx.state.user });
    },
  },
  // POST /api/auth/password-reset — always accepts (mirrors "if the account
  // exists, we sent a reset link"); never leaks whether the email is registered.
  {
    path: "/api/auth/password-reset",
    method: "POST",
    handler: () => json({ ok: true }),
  },
];
