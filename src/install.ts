// Wires the engine to the browser: patches window.fetch so /api/* requests are
// answered by the mock backend and everything else passes through untouched.

import { Backend } from "./backend";
import { delay, isApiPath, normalizeRequest } from "./http";
import type { MockBackend, MockBackendConfig } from "./types";

// Only one install is active at a time; a second install replaces the first.
let active: MockBackend | null = null;

/**
 * Install the mock backend by patching `window.fetch`.
 *
 * - Requests to `/api/*` with a matching handler get a scenario-driven mock
 *   Response (real status code + JSON, plus the optional latency).
 * - Everything else (CDN imports, assets, third-party APIs) falls through to
 *   the original `window.fetch`.
 *
 * Returns a handle to flip scenarios, register product routes, and `uninstall()`.
 */
export function installMockBackend(config: MockBackendConfig = {}): MockBackend {
  if (typeof window === "undefined") {
    throw new Error("[design-kit] installMockBackend requires a browser (window) environment.");
  }
  // Re-installing tears the previous patch down first so fetch isn't double-wrapped.
  if (active) active.uninstall();

  const backend = new Backend(config);
  const baseUrl = config.baseUrl ?? window.location.origin;

  // Capture the originals by reference (no .bind — uninstall must restore the
  // exact same function). In real browsers window.fetch === globalThis.fetch;
  // some test runtimes (jsdom) keep them as distinct bindings, so we patch and
  // restore both to guarantee a consumer's bare `fetch()` is also intercepted.
  const realWindowFetch = window.fetch;
  const sharedGlobal = globalThis !== (window as unknown as typeof globalThis);
  const realGlobalFetch = sharedGlobal ? globalThis.fetch : null;

  const mockFetch: typeof fetch = async (input, init) => {
    const req = normalizeRequest(input, init, baseUrl);
    if (isApiPath(req.url)) {
      const res = await backend.handle(req);
      if (backend.latency > 0) await delay(backend.latency);
      return res;
    }
    // Call with `window` as `this` so the native fetch doesn't trip on an
    // illegal invocation, without storing a fresh bound reference.
    return realWindowFetch.call(window, input, init);
  };

  window.fetch = mockFetch;
  if (sharedGlobal && realGlobalFetch) globalThis.fetch = mockFetch;

  const handle: MockBackend = {
    setScenario: (name) => backend.setScenario(name),
    getScenario: () => backend.getScenario(),
    registerHandlers: (routes) => backend.registerHandlers(routes),
    getState: () => backend.getState(),
    reset: () => backend.reset(),
    uninstall: () => {
      // Only restore if no one re-patched on top of us.
      if (window.fetch === mockFetch) window.fetch = realWindowFetch;
      if (sharedGlobal && realGlobalFetch && globalThis.fetch === mockFetch) {
        globalThis.fetch = realGlobalFetch;
      }
      if (active === handle) active = null;
    },
  };
  active = handle;
  return handle;
}
