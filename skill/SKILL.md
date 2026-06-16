---
name: agentaily-design-kit
description: 怎么在 Claude Design 原型里用 @agentaily/design-kit(浏览器 mock 后端:patch window.fetch + Tweaks 驱动场景),让纯 SPA 原型跑真守卫 fetch = 高保真。仅 Claude Design 设计时用、不进生产。
---

# agentaily-design-kit — 在 Claude Design 里给原型一个「假后端」

`@agentaily/design-kit` 是一个 **Claude-Design-only 的浏览器 mock 后端**。agentaily app 是纯 SPA,启动后客户端 `fetch('/api/auth/me')` 等真 Cloudflare Worker;Claude Design 原型是静态 HTML、**没后端**。design-kit 补这块:patch `window.fetch` 拦 `/api/*`、返回**场景驱动**的 mock 响应,让原型跑**真的守卫 / 数据 fetch 代码**,只把网络层 mock 掉 —— **设计端 ≈ 生产端,高保真**。

> ⚠️ **只在 Claude Design 设计时用,绝不进生产。** 生产用真后端(真 fetch),design-kit 只让原型在没有真后端时也能真实地跑起来。

## 装哪 / 怎么引

**Claude Design 原型(静态 HTML / `.card.html`)里走 CDN(esm.sh):**

```html
<script type="module">
  import { installMockBackend } from "https://esm.sh/@agentaily/design-kit";
  installMockBackend({ scenario: "loggedOut" });
  // 之后页面里真的 await fetch('/api/auth/me') 就会被拦、按场景返回。
</script>
```

配合 web-kit / design-system 也走 CDN 引(真组件 + 真运行时),整个原型就是「真代码 + 假后端」。

## 核心 API

- **`installMockBackend(config)`** → 返回 handle:`{ setScenario, getScenario, registerHandlers, getState, reset, uninstall }`。
  - 存原始 `window.fetch` → 替换;`/api/*` 命中注册 handler → 返回 mock `Response`(真状态码 + JSON + 可选延迟);非 `/api` → 走原始 fetch(放行 CDN import 等)。
  - `config`:`{ scenario?, latency?, user?, scenarios?, handlers?, baseUrl? }`(`user` 覆盖场景里的假 user,如自定义 email)。
- **`handle.setScenario(name)`**:切场景(供 Tweaks 调用),重置内存态。
- **`handle.registerHandlers([{ method?, path, handler }])`**:注册**产品专属**路由(引擎共享、产品 handler 各自加;`path` 可为字符串或 RegExp,`handler(req, ctx)` 返回 `Response`)。

### 内置场景(auth)

| scenario           | `/api/auth/me`                             |
| ------------------ | ------------------------------------------ |
| `loggedOut`        | 401                                        |
| `loggedInVerified` | 200 `{ user: { …, emailVerified: true } }` |
| `loggedInPending`  | 200 `emailVerified: false`                 |
| `serverError`      | 500                                        |

内置 auth handlers:`/api/auth/me \| login \| register \| verify-email \| password-reset`,有内存态(假 user + token),`login→me→logout` 流程端到端。

## 和 Tweaks 接(关键用法)

把 design-kit 的场景**挂到 Claude Design 的 Tweaks** —— 一个 Tweak 同时驱动 UI 模式 + 后端响应:

```js
const mock = installMockBackend({ scenario: "loggedOut" });
// Tweak 的 onChange 里:
onTweakChange((value) => mock.setScenario(value)); // 未登录 / 已登录已验证 / 待验证 / 异常
```

翻 Tweak → mock 响应变 → **真守卫(`await fetch('/api/auth/me')`)据此跳登录 / 放行 / 改道**。这是 design-kit 的核心价值:守卫那段生产逻辑真在跑,不是 Tweak 直接设 `loggedIn=true` 假装。

## 迁移已有原型(从自造 mock → design-kit)

- 原型里若有**手写的 `validateSession()` 桩 / inline fetch-mock / 直接读 Tweak 变量假装登录态** → 换成:`installMockBackend()` + 守卫里真 `await fetch('/api/auth/me')` + Tweak 调 `setScenario`。
- 这正是 2026-06-16 spike 验证的模式(form-design auth 项目)。

## 坑

- **只 Claude Design 用**:别在生产 bundle 里引(生产用真后端)。
- **一页一个 mock owner**:`installMockBackend` patch 全局 `fetch`,一个页面只装一次;`uninstall()` 还原原始 fetch。
- **契约要对齐真后端**:内置 handler 的响应形状镜像真 Cloudflare Worker;真后端契约变了,design-kit 要跟着改(MVP 手镜像;长期抽 `@agentaily/api-contract` 让两边共用、防漂)。
- **放行非 /api**:patch 后务必让非 `/api` 请求走原始 fetch,否则 CDN import / 字体等会被误拦。

## 现状

首版实现 + 首发走 fleet PR(`agentaily/design-kit` PR #1)+ CI changesets 发版。设计真相 + spike 见仓库 `README.md` / 全局记忆 `design-kit-mock-backend-validated`。**发布后**这里的 esm.sh 引用即可用;未发布前以本 skill 描述的目标 API 为准。
