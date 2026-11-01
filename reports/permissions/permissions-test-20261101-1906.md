# 健澜AI原生医院操作系统OS — 权限测试报告

- 审查对象：`web/src/router`、`web/src/api`、`web/src/services`、`src/bff/routes`、`src/bff/middleware/auth.ts`、`src/bff/permissions.ts`
- 审查时间：2026-11-01 19:06（UTC+8）
- 基线 HEAD：`0cddcdf9cbeb42f8d150d1bff36b38bb19e54ef7`
- 方法：静态扫描（脚本 + 人工抽样核对），非运行时渗透；DEMO_MODE=1 离线。

---

## 1. 前端路由清单（web/src/router）

路由文件：`web/src/router/index.tsx`（约 10700 行）、`outpatientRoutes.tsx`、`guards.tsx`、`RequireAuth.tsx`。

- 路由总数（`<Route path=...>`）：**2953**
- 统一登录外壳：`<Route path="/" element={<RequireAuth><AppLayout/></RequireAuth}>`，其下所有子路由默认要求登录；少数子路由再叠加 `RequirePermission permission="..."`。
- 公开路由（在登录外壳之外，无需登录）：`/login`、`/forgot-password`、`/login-legacy`、`/403`、`/builder/edit/:agentId`（后者包了 RequireAuth）。

守卫机制（两套并存，文件头已说明）：
- `RequireAuth`（RequireAuth.tsx，基于 `useUserStore`）：仅登录态。
- `RequirePermission` / `PermissionWrapper` / `usePermission`（guards.tsx，基于 `useAuthStore`）：细粒度权限/角色。

带 `RequirePermission permission=` 的路由（实测仅 9 处命中，去重后权限码 4 个）：

| 前端权限码 | 出现处（示例） |
|---|---|
| `patient:view` | `patients`（PatientList）、`dashboard/ceo-board` 等 |
| `billing:read` | 发票/账单页 |
| `pharmacy:view` | 药房页 |
| `surgery:view` | 手术页 |

> 说明：2953 条路由中，仅约 9 条做了路由级细粒度权限码；其余子路由在登录外壳内「登录即可访问」，细粒度收斂依赖 BFF 端 `requirePermissionCode`。这是当前权限模型的主要特征——**前端只做登录 + 少量菜单级码，真正的医疗级权限在 BFF**。

---

## 2. 前端 API 调用（web/src/api、web/src/services）

- HTTP 客户端：`web/src/services/request.ts`（axios 实例，baseURL 含 `/api/v1`，30s 超时，幂等 GET 最多重试 2 次，401 跳登录，403 业务提示，自动带 CSRF 头）。
- API 客户端规模：`web/src/services/api/` 下数百个按业务/里程碑命名的文件（如 `consultAgent.ts`、`cds.ts`、`ceoDashboard.ts`、`*.ts` 工作量看板族）。
- 前端 API 普遍使用相对路径（如 `post('/consult-agent/threads', ...)`），由 baseURL 补全；SSE 流用原生 `fetch` + `env.apiBaseUrl`。

### 抽样核对：consult-agent（本轮分支焦点，前后端一致）

| 前端调用（web/src/services/api/consultAgent.ts） | BFF 端点（src/bff/routes/consultAgentRoutes.ts） | BFF 权限码 | 一致 |
|---|---|---|---|
| POST `/consult-agent/threads` | POST `/api/v1/consult-agent/threads` | `consult-agent:write` | ✅ |
| GET `/consult-agent/threads` | GET `/api/v1/consult-agent/threads` | `consult-agent:read` | ✅ |
| POST `.../threads/:id/messages` | POST `.../messages` | `consult-agent:write` | ✅ |
| GET `.../threads/:id/messages` | GET `.../messages` | `consult-agent:read` | ✅ |
| POST `.../transcribe` | POST `.../transcribe` | `consult-agent:write` | ✅ |
| GET `.../threads/:id/audit` | GET `.../audit` | `consult-agent:audit` | ✅ |
| GET `/consult-agent/rules/snapshot` | GET `/api/v1/consult-agent/rules/snapshot` | `consult-agent:read` | ✅ |
| POST `.../threads/:id/stream` | POST `.../stream` | `consult-agent:write` | ✅ |
| GET `.../stream/replay` | GET `.../stream/replay` | `consult-agent:read` | ✅ |
| GET `.../drafts/:kind` | GET `.../drafts/:kind` | `consult-agent:read` | ✅ |
| GET `/consult-agent/profile` | GET `/api/v1/consult-agent/profile` | `consult-agent:read` | ✅ |
| POST `.../threads/:id/exit` | POST `.../exit` | `consult-agent:write` | ✅ |

结论：consult-agent 12 端点前后端路径与权限码**完全对齐**，无错配、无悬空。

---

## 3. BFF 路由挂载与鉴权中间件（src/bff）

路由定义形状（`src/bff/types.ts` RouteDef）：
```ts
interface RouteDef { method: string; path: string; handle: Handler; auth?: boolean; }
```
装配位置：`src/bff/server.ts`
- `attachUser(ctx)` 解析 JWT / 演示 token（行 6769）；
- `if (r.def.auth) { requireAuth(ctx); ... }`（行 6806-6807）——`auth:true` 才强制登录；
- 细粒度权限由 handler 内 `requirePermissionCode(c, code)` 完成（admin 角色直通，否则校验 JWT permissions 数组，`:read` 支持 `report:*` 分组码通配）。

权限码单一事实来源：`src/bff/permissions.ts`，已登记域：
imaging、inpatient、emergency、inpatient_care、pharmacy、mobile_nursing、mobile_staff、nursing_admin、**consult_agent（read/write/audit）**。

### BFF 路由扫描统计

| 指标 | 数量 |
|---|---|
| 路由文件数 | 2403 |
| 解析到的路由条目 | 3387 |
| `auth:false`（显式免登录） | 282 |
| 未显式声明 `auth` 标志 | 86 |

`auth:false` / 未声明 auth 的代表性条目（**已识别，列入 backlog，本轮不批量改**）：
- 开放/合理公开：`/api/v1/auth/login`、`/auth/refresh`、`/auth/login/mfa`、`/internet/patient/login`、`/help`、`/api/docs`、`/api/openapi.json`、`/demo/status`。
- **敏感度待复核**（当前 `auth:false`，建议后续逐项确认是否应登录）：
  - `GET /api/v1/admin/official-docs`、`/admin/meetings`、`/admin/announcements`、`/admin/duty-roster`、`/admin/vehicle-dispatch`、`/admin/general-procurement`（adminOffice.ts）
  - `GET /api/v1/bi/drg-groups`、`/bi/revenue-trend`、`/bi/bed-utilization`、`/finance/cost-center`、`/finance/performance`（biOperationsAnalysis.ts）
  - `GET /api/v1/cds/intercepts`、`/cds/interactions`、`/cds/diff-diagnosis`、`/cds/decision-log`（cdsDeep.ts）
  - `GET /api/v1/emr/headpages`、`/emr/archive-records`、`/emr/copies`（emrLevel5Review.ts）
  - `GET /api/v1/emergency/triage-records`、`/emergency/ambulance-trips`、`/emergency/trauma-cases`（emergencyCare.ts）
  - `GET /api/v1/bi/live-board`、`/bi/dept-rank`、`/bi/outpatient-flow`（ceoBoard.ts，院长驾驶舱）

> 注：以上为静态启发式结果（每条路由向后 1200 字符窗口内识别 `auth:`），个别误判可能存在；且当前 DEMO_MODE=1 下 `requireAuth` 会短路授予 demo admin（仅非生产）。生产环境口径以 `requireAuth` 真实校验为准。这些属于「上线前必须逐项复核」清单，不在本轮「就地修复」范围（任务书明确不批量改既有路由挂载）。

---

## 4. 三方一致性矩阵（前端路由码 ↔ 菜单码 ↔ BFF API 码）

| 维度 | 现状 | 一致性结论 |
|---|---|---|
| 前端路由码 | 仅 4 个：`patient:view`、`billing:read`、`pharmacy:view`、`surgery:view` | — |
| BFF 已登记码 | imaging/inpatient/emergency/pharmacy/nursing/mobile/consult-agent 等约 30+ 个具名码 + 海量 `xxx:read` 报表码（分组通配） | 前端 4 码是 BFF 码的**子集**，方向正确（前端不要求 BFF 没有的码）。 |
| consult-agent 前端↔BFF | 12 端点全对齐（§2 表） | ✅ 一致 |
| 菜单权限码 | BFF `GET /api/v1/auth/menus` 下发菜单；前端 `authStore.permissions/roles` 承接 | 菜单码与路由码同源（均来自登录态），无错配证据。 |

发现的问题（分级）：

| 类型 | 数量 | 说明 | 是否本轮修复 |
|---|---|---|---|
| 前端重复相对 path | ~150 组（`system/config`×4、`tenants/quota`×4、`fhir/practitioner`×3、`anesthesia/records`×3、`outpatient/visits`×3…） | 同一登录外壳下重复 path，React Router 首匹配生效，后续为死路由；多数渲染同组件，少数渲染不同组件（如 `patients` 在 4896 行 `PatientList` 与 10427 行 `MobilePatients`，后者被遮蔽）。 | **否**（任务书：不改未点名的既有路由挂载；批量删路由风险高，列入 backlog） |
| 敏感 BFF 路由漏挂登录 | 282 `auth:false` + 86 未声明 | 含 admin/bi/cds/emr/emergency 看板（§3） | **否**（同上，列入上线前复核清单） |
| 前端路由权限码 ↔ BFF 错配 | 0 | consult-agent 全对齐；前端 4 码均为 BFF 已知码 | 无需修复 |
| 悬空路由（有页面无 API） | 未逐一枚举；consult-agent 链路闭环 | 看板族多为 demo 聚合器，均有对应 BFF 路由 | 抽样通过 |
| 未挂载鉴权的敏感写路由 | 未发现 consult-agent 写链路漏鉴权 | 每个写端点均 `requirePermissionCode` | 通过 |

---

## 5. 品牌硬违规扫描（大小写敏感，src/ + web/src/）

扫描串：任务书列明的 7 个被禁旧称（含连字符/驼峰各变体、错误汉字写法及错误英文写法），大小写敏感。

| 位置 | 命中 |
|---|---|
| `src/`（.ts/.tsx/.js/.json/.md/.html） | **0**（大小写敏感） |
| `web/src/`（同上） | **0** |

补充：宽口径扫描仅在 `src/bff/observability/metrics.ts` 与 `src/core/observability/metrics.ts` 命中 `gangos_`（**下划线**指标前缀，共约 13 处）。按任务书明确口径——这是存量 `gangos_` 下划线指标名专项 backlog，**本轮不替换**。

---

## 6. 本轮就地修复记录

本轮审查在授权范围内（循环依赖 / 权限码错配 / 悬空路由 / 重复 Route / 敏感路由漏挂鉴权 / 新增品牌硬违规）**未发现需要立即修改的硬错误**：

- 循环依赖：无；
- 权限码错配：0（consult-agent 12 端点前后端对齐）；
- 品牌硬违规：0（7 个禁词串在 src/ + web/src/ 大小写敏感扫描为 0）；
- 重复 Route / 敏感路由漏挂：已识别并记录（§3、§4），按任务书「不扩大范围、不改未点名既有路由挂载」原则，**不做批量改动**，转为上线前复核 backlog。

> 即：本轮修复清单为空。双 tsc 门禁基线已为双零，未改代码因此门禁维持双零（见架构报告 §6 与交付摘要）。
