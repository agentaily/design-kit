// Public contract for @agentaily/design-kit. Changing anything exported here is
// an API change — keep it backward compatible. tsup emits dist/index.d.ts from
// these types.

/** A fake authenticated user, shaped to mirror the real Cloudflare Worker. */
export interface MockUser {
  id: string;
  email: string;
  emailVerified: boolean;
  [extra: string]: unknown;
}

/**
 * Live, mutable in-memory backend state. A scenario seeds it; auth handlers
 * (login / logout / register / verify-email) mutate it so flows run end-to-end.
 */
export interface BackendState {
  /** Fake session token; null = no session (→ /api/auth/me 401). */
  token: string | null;
  /** The current fake user, or null when logged out. */
  user: MockUser | null;
  /** When set, every /api/* response is forced to this status (serverError). */
  forceStatus: number | null;
}

/** A named scenario seeds the initial {@link BackendState} when selected. */
export interface Scenario {
  name: string;
  /** Human-readable note (surfaced to Tweaks UIs, optional). */
  describe?: string;
  /** Produce a fresh initial state each time the scenario is selected. */
  init: () => BackendState;
}

/** A normalized view of an intercepted request handed to handlers. */
export interface MockRequest {
  /** Upper-cased HTTP method (GET, POST, …). */
  method: string;
  /** Absolute URL (relative paths resolved against the configured base URL). */
  url: URL;
  /** Convenience accessor for `url.pathname`. */
  path: string;
  headers: Headers;
  /** Parsed JSON body, or undefined when there is no body / it is not JSON. */
  json: () => Promise<unknown>;
  /** Raw request body as text, or "" when absent. */
  text: () => Promise<string>;
}

/** Context passed to every handler: the live state + the active scenario name. */
export interface HandlerContext {
  state: BackendState;
  scenario: string;
}

/**
 * A handler returns a Response to answer the request, or `undefined` to decline
 * (the next matching route — or the built-in 404 — takes over).
 */
export type Handler = (
  req: MockRequest,
  ctx: HandlerContext,
) => Response | Promise<Response> | undefined | Promise<undefined>;

/** A route binds a path (and optional method) to a {@link Handler}. */
export interface HandlerRoute {
  /** Pathname to match exactly, or a RegExp tested against the pathname. */
  path: string | RegExp;
  /** HTTP method to match (case-insensitive). Omit to match any method. */
  method?: string;
  handler: Handler;
}

/** Configuration for {@link installMockBackend}. */
export interface MockBackendConfig {
  /** Initial scenario name. Default: "loggedOut". */
  scenario?: string;
  /** Artificial delay (ms) applied before every mocked /api response. */
  latency?: number;
  /**
   * Overrides applied to the scenario's seeded user (e.g. a custom email).
   * Ignored by scenarios that seed no user (loggedOut / serverError).
   */
  user?: Partial<MockUser>;
  /** Extra or overriding named scenarios, merged over the built-ins. */
  scenarios?: Scenario[];
  /** Product-specific routes, checked before the built-in auth routes. */
  handlers?: HandlerRoute[];
  /**
   * Origin used to resolve relative request URLs. Defaults to
   * `window.location.origin` (the page the prototype is served from).
   */
  baseUrl?: string;
}

/** The handle returned by {@link installMockBackend}. */
export interface MockBackend {
  /** Switch the active scenario; reseeds the in-memory state. */
  setScenario: (name: string) => void;
  /** Name of the currently active scenario. */
  getScenario: () => string;
  /** Register additional product routes at runtime (checked before built-ins). */
  registerHandlers: (routes: HandlerRoute[]) => void;
  /** Read-only snapshot of the live in-memory state. */
  getState: () => Readonly<BackendState>;
  /** Reseed the in-memory state from the active scenario. */
  reset: () => void;
  /** Restore the original `window.fetch` (and `globalThis.fetch`). */
  uninstall: () => void;
}
