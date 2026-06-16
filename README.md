# @agentaily/design-kit

Claude-Design-only **browser mock backend** — gives high-fidelity SPA prototypes a fake backend.

agentaily apps are pure SPAs: on boot they `fetch('/api/auth/me')` (etc.) against a real Cloudflare Worker. Claude Design prototypes are static HTML with **no backend**. design-kit fills that gap: it patches `window.fetch` to intercept `/api/*` and return **scenario-driven** mock responses (scenarios driven by Claude Design **Tweaks**), so the prototype runs the **real** client-side guard / data-fetch code against a fake backend — 设计端 ≈ 生产端, only the network is mocked.

Imported via **CDN inside Claude Design** (esm.sh); never shipped to production.

## Target API

```js
import { installMockBackend } from "https://esm.sh/@agentaily/design-kit";

installMockBackend({ scenario: "loggedOut" });
// fetch("/api/auth/me") → 401 (per scenario); the real guard reacts (→ /login).
// flip the Tweak → scenario changes → mock response changes → guard behaves differently.
```

## Design

- **Mechanism**: save original `window.fetch`, replace it; `/api/*` → registered handler (scenario-aware), everything else (CDN imports, etc.) → original fetch.
- **Scenarios** (driven by Tweaks): `loggedOut` → 401; `loggedInVerified` → 200 `{user:{...,emailVerified:true}}`; `loggedInPending` → 200 `emailVerified:false`; `serverError` → 500; configurable latency.
- **In-memory state** (fake user + token) so flows work end-to-end (login → me → logout), not single-frame.
- **Scope**: generic mock engine + shared **auth** handlers (`/api/auth/me|login|register|verify-email|password-reset`); product-specific routes registered by each design project.
- **Contract**: MVP hand-mirrors the real Worker's auth routes (mark "TODO: extract `@agentaily/api-contract`" so the real Worker + design-kit share it and don't drift).

## Status

Scaffolding. Validated via spike (2026-06-16, form-design auth project: `_spike-auth-guard.card.html` + `_mock-backend.js` — flipping a Tweak made the real `fetch('/api/auth/me')` guard redirect vs. allow). Implementation lands via fleet PR. Usage skill: `skill/SKILL.md` (once published).
