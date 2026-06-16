# @agentaily/design-kit

## 0.1.0

### Minor Changes

- [#1](https://github.com/agentaily/design-kit/pull/1) [`7de3c8a`](https://github.com/agentaily/design-kit/commit/7de3c8a693d91ba17125c0e6692033b661061462) Thanks [@yarnovo](https://github.com/yarnovo)! - feat: initial mock backend — installMockBackend + 场景引擎 + auth handlers

  首版实现:patch `window.fetch` 拦 `/api/*`、非 `/api` 放行;命名场景引擎
  (`loggedOut` / `loggedInVerified` / `loggedInPending` / `serverError` + 可配
  `latency`)+ 内存态假 user/token(login→me→logout 端到端)+ 共享 auth handlers
  (`/api/auth/me|login|register|verify-email|password-reset`)+ `registerHandlers`
  注册产品专属路由 + `uninstall()` 还原。tsup 出 ESM+CJS+.d.ts,CDN(esm.sh)服务 dist。
