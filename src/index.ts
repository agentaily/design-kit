// @agentaily/design-kit — Claude-Design-only browser mock backend.
//
//   import { installMockBackend } from "https://esm.sh/@agentaily/design-kit";
//   const mock = installMockBackend({ scenario: "loggedOut" });
//   // fetch("/api/auth/me") → 401 per scenario; flip via Tweaks → mock.setScenario(...)

export { installMockBackend } from "./install";
export { Backend } from "./backend";
export { builtinScenarios, DEFAULT_SCENARIO, MOCK_SESSION_TOKEN } from "./scenarios";
export { authHandlers } from "./authHandlers";
export { json } from "./http";

export type {
  MockBackend,
  MockBackendConfig,
  MockUser,
  BackendState,
  Scenario,
  Handler,
  HandlerRoute,
  HandlerContext,
  MockRequest,
} from "./types";
