// vitest's jsdom environment does not implement `fetch` on `window` (jsdom ships
// XMLHttpRequest, not fetch). Node 18+ exposes a native `fetch` on globalThis,
// so we install it onto `window` — this gives the library a real original
// `window.fetch` to save and restore, modelling "a browser that has fetch".
//
// Headers / Request / Response come from Node's native (undici) globals, which
// jsdom does not override, so they are already available to handlers.
if (typeof window !== "undefined" && typeof window.fetch !== "function") {
  Object.defineProperty(window, "fetch", {
    configurable: true,
    writable: true,
    value: globalThis.fetch.bind(globalThis),
  });
}
