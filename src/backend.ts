// The scenario engine: holds the live in-memory state, the scenario table and
// the registered routes, and turns an intercepted /api request into a Response.

import { authHandlers } from "./authHandlers";
import { json } from "./http";
import { builtinScenarios, DEFAULT_SCENARIO } from "./scenarios";
import type {
  BackendState,
  HandlerContext,
  HandlerRoute,
  MockBackendConfig,
  MockRequest,
  MockUser,
  Scenario,
} from "./types";

function routeMatches(route: HandlerRoute, req: MockRequest): boolean {
  if (route.method && route.method.toUpperCase() !== req.method) return false;
  if (typeof route.path === "string") return route.path === req.path;
  return route.path.test(req.path);
}

export class Backend {
  private scenarios = new Map<string, Scenario>();
  private productRoutes: HandlerRoute[] = [];
  private scenarioName: string;
  private state: BackendState;
  private readonly userOverride: Partial<MockUser> | undefined;
  /** Latency (ms) applied to every mocked /api response. */
  readonly latency: number;

  constructor(config: MockBackendConfig = {}) {
    for (const scenario of Object.values(builtinScenarios)) {
      this.scenarios.set(scenario.name, scenario);
    }
    for (const scenario of config.scenarios ?? []) {
      this.scenarios.set(scenario.name, scenario);
    }
    if (config.handlers) this.productRoutes.push(...config.handlers);

    this.latency = config.latency ?? 0;
    this.userOverride = config.user;
    this.scenarioName = config.scenario ?? DEFAULT_SCENARIO;
    this.state = this.seed(this.scenarioName);
  }

  // Build the initial state for a scenario, applying the configured user override
  // onto whatever user the scenario seeds (no-op when the scenario is logged out).
  private seed(name: string): BackendState {
    const scenario = this.scenarios.get(name);
    if (!scenario) throw new Error(`[design-kit] unknown scenario: ${name}`);
    const state = scenario.init();
    if (this.userOverride && state.user) {
      state.user = { ...state.user, ...this.userOverride };
    }
    return state;
  }

  setScenario(name: string): void {
    this.state = this.seed(name);
    this.scenarioName = name;
  }

  getScenario(): string {
    return this.scenarioName;
  }

  reset(): void {
    this.setScenario(this.scenarioName);
  }

  registerHandlers(routes: HandlerRoute[]): void {
    this.productRoutes.push(...routes);
  }

  getState(): Readonly<BackendState> {
    return this.state;
  }

  /** Resolve an intercepted /api request to a Response. */
  async handle(req: MockRequest): Promise<Response> {
    // serverError (or any forceStatus scenario) short-circuits every route.
    if (this.state.forceStatus != null) {
      return json({ error: "server_error" }, { status: this.state.forceStatus });
    }

    const ctx: HandlerContext = { state: this.state, scenario: this.scenarioName };
    // Product routes win over built-in auth so consumers can override.
    for (const route of [...this.productRoutes, ...authHandlers]) {
      if (!routeMatches(route, req)) continue;
      const res = await route.handler(req, ctx);
      if (res) return res;
    }
    return json({ error: "not_found", path: req.path }, { status: 404 });
  }
}
