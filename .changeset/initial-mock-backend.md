---
"@agentaily/design-kit": minor
---

feat: initial mock backend — installMockBackend + 场景引擎 + auth handlers

首版实现:patch `window.fetch` 拦 `/api/*`、非 `/api` 放行;命名场景引擎
(`loggedOut` / `loggedInVerified` / `loggedInPending` / `serverError` + 可配
`latency`)+ 内存态假 user/token(login→me→logout 端到端)+ 共享 auth handlers
(`/api/auth/me|login|register|verify-email|password-reset`)+ `registerHandlers`
注册产品专属路由 + `uninstall()` 还原。tsup 出 ESM+CJS+.d.ts,CDN(esm.sh)服务 dist。
