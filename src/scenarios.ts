// Built-in scenarios. Each seeds the initial in-memory BackendState; auth
// handlers then mutate that state so flows (login → me → logout) run live.
// Tweaks in Claude Design pick the scenario by name.

import type { MockUser, Scenario } from "./types";

const MOCK_EMAIL = "user@agentaily.com";
const MOCK_TOKEN = "mock-session-token";

function mockUser(emailVerified: boolean): MockUser {
  return { id: "u_mock", email: MOCK_EMAIL, emailVerified };
}

export const MOCK_SESSION_TOKEN = MOCK_TOKEN;

/** Map of the built-in scenarios keyed by name. */
export const builtinScenarios: Record<string, Scenario> = {
  // No session → the real guard's `fetch('/api/auth/me')` gets 401 → redirects.
  loggedOut: {
    name: "loggedOut",
    describe: "No session — /api/auth/me returns 401.",
    init: () => ({ token: null, user: null, forceStatus: null }),
  },
  // Signed in, email verified → /api/auth/me returns 200 with emailVerified:true.
  loggedInVerified: {
    name: "loggedInVerified",
    describe: "Signed in, email verified.",
    init: () => ({ token: MOCK_TOKEN, user: mockUser(true), forceStatus: null }),
  },
  // Signed in but email NOT verified → drives the "verify your email" banner.
  loggedInPending: {
    name: "loggedInPending",
    describe: "Signed in, email pending verification.",
    init: () => ({ token: MOCK_TOKEN, user: mockUser(false), forceStatus: null }),
  },
  // Backend down → every /api/* call returns 500 (exercise error states).
  serverError: {
    name: "serverError",
    describe: "Backend failure — every /api/* call returns 500.",
    init: () => ({ token: null, user: null, forceStatus: 500 }),
  },
};

/** The default scenario when none is configured. */
export const DEFAULT_SCENARIO = "loggedOut";
