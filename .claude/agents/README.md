# design-kit — agents / 方法论 + done-gate

`@agentaily/design-kit` 是一个**小型、框架无关的 TypeScript 库**(Claude Design 用的浏览器 mock 后端)。无 React、用 **tsup** 构建到 `dist/`(ESM + CJS + `.d.ts`)、`files:["dist"]`、CDN(esm.sh)服务 dist ESM。逻辑层很薄,不需要重型双循环角色分工 —— **本 README 即方法论 + done-gate 真相源**(替代 TESTING.md,参照 design-system 的「Verification recipe」约定)。

## 五条铁律(精简)

1. **契约先行**:`src/index.ts` 的导出(tsup 生成 `dist/index.d.ts`)是对外契约;改它即改公开 API,要向后兼容。
2. **测试护栏**:每个行为有 `vitest` 单测(jsdom 环境,验 `window.fetch` patch / 场景切换 / handler 响应)。
3. **小步、可验**:每个改动跑 done 命令绿了才算完。
4. **不漏文档**:公开 API 变了,同步 `README.md` + `skill/SKILL.md`(用法 skill)。
5. **CDN 友好**:产物是 tsup 出的 dist ESM(esm.sh 服务);保持框架无关、无重型运行时依赖。

## 双循环(轻量)

- **外环(行为)**:从「目标 API + 场景行为」写 vitest 集成测试(installMockBackend → fetch /api/\* → 断言响应随场景变)。
- **内环(实现)**:写 `src/` 让外环绿。
- 逻辑库无 UI,**不走 Claude Design / design-sync**(design-kit 自己就是给 Claude Design 用的,但它的代码是普通逻辑库)。

## Verification recipe(done-gate — 真相源)

做完任何改动,跑这个、全绿才算 DONE:

```
npm run typecheck && npm test && npm run build
```

(`build` 须出 `dist/` 的 ESM + CJS + `.d.ts` —— `files:["dist"]`,空 dist = 空包。CI 见 `.github/workflows/ci.yml`。发版走 changesets:加 `.changeset/*.md` → 合 main → `release.yml`(发布前先 `npm run build`)自动开 Version PR → auto-merge → 发 npm。首发也走这条 CI 链,别手动 publish。)

## 领域概念

- **installMockBackend(config)**:patch `window.fetch`,拦 `/api/*`、其余放行。
- **场景引擎**:命名场景(loggedOut / loggedInVerified / loggedInPending / serverError…)→ 决定 handler 返回;场景由 Claude Design 的 Tweaks 选。
- **内存态**:假 user + 假 token,让 login→me→logout 流程端到端。
- **handlers**:auth 路由(/api/auth/me|login|register|verify-email|password-reset)是共享内置;产品专属路由由消费方注册。
- 设计真相 + spike 见仓库 `SPEC.md` / 全局记忆 `design-kit-mock-backend-validated`。
