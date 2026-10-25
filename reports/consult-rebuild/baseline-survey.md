# consult-agent 重建基线勘查档案（本机 Windows · 2026-10-25）

> 用途：设备从受限 Linux 沙箱切换到 Windows 本机后，旧沙箱内 consult-agent 源码、25 个本地提交与备份分支随沙箱销毁；经全量勘查，三个远端仓库均无 consult-agent 留存，旧会话轨迹与本地/归档盘亦无源码备份。本档案记录本机主干基线、工具链、既有工程范式与远端现状，作为在本机重建 consult-agent 子系统的事实基线。所有结论均为本机实测，不沿用旧沙箱口径。

## 1. 仓库与基线 SHA（实测 `git ls-remote` + 本地 `git rev-parse`）

| 项 | 值 | 状态 |
|---|---|---|
| 本机仓库 | `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1` | 工作仓库 |
| 本地分支 | `master`，跟踪 `gitcode/master` | HEAD = `3f0190788ce05fd7231bbefb68618cecccbc470e` |
| 远端 `gitcode`（JLMEDAIOS 旧仓） | `git@gitcode.com:weixin_46642356/JLMEDAIOS.git`（SSH） | master = `3f019078`，与本地一致 |
| 远端 `mirror`（GitHub JLAIharnessos） | `git@github.com:chenweidaben/JLAIharnessos.git`（SSH） | master = `3f019078`，与本地一致 |
| 远端 `origin`（JLMEDAIOS，HTTPS 历史配置） | 内嵌历史 oauth2 token，**重建不沿用**；推送统一走 SSH | 同 gitcode |
| 新仓 HEAGENTOS | `git@gitcode.com:weixin_46642356/HEAGENTOS.git`（待新增 remote `heagentos`） | main = `9d3f5be1e4f18e2b9c1d375f039321c57802de47`，3 行占位 README，与主干**无共同祖先** |

### 认证现状（实测 SSH -T）
- GitHub SSH：`Hi chenweidaben! You've successfully authenticated`（写通道可用）。
- GitCode SSH：`Welcome to GitCode, weixin_46642356`（写通道可用）。
- 旧沙箱阻塞项（账号密码 Basic 被停用、须 PAT）在本机不复存在：两平台 SSH 公钥已授权。
- `gh` CLI 未登录；推送以 SSH 为准，不依赖 gh。
- 安全约定：`origin` URL 内历史 token 明文不复制、不写入新配置、不在日志/提交中回显；本次推送只使用 SSH remote。

## 2. 工具链与基线门禁（本机实测）

| 项 | 实测值 |
|---|---|
| node | v22.23.2；npm 10.9.8 |
| bun | 1.2.0，可执行文件 `C:\Users\lenovo\.bun\bin\bun.exe`（未加入 PATH，脚本内用绝对路径或先把该目录加入 PATH） |
| 依赖 | `node_modules` 在位；本地 `node_modules\.bin\tsc.cmd` 可用 |
| 根类型检查 | `tsc --noEmit` → **exit 0（净绿基线）**，无历史遗留报错 |
| 包管理 | bun@1.4.2 声明（本机 bun 1.2.0，执行测试/脚本时以不破坏基线为前提，优先本地 tsc + bun:test） |
| 技术栈 | TypeScript 6.0.2、React 19.2.4、zod 4.3.6、postgres、ioredis、ws、@modelcontextprotocol/sdk、@anthropic-ai/sdk；ESLint 9 + simple-import-sort、Prettier 3 |

### 主干既有脚本（package.json）
- `typecheck`: `tsc --noEmit`
- `lint:ci`: `eslint . --max-warnings 0`
- `format:check`: `prettier --check "src/**/*.{ts,tsx,js,jsx,json,md,yml,yaml}"`
- `test`: `bun test`；`test:unit` / `test:integration` / `test:e2e`
- `bff`: `bun run src/bff/server.ts`

## 3. 工作区处置纪律（实测）
- 跟踪改动（**不属于本次 consult 范围，保持原样、不得纳入本次提交**）：
  - `M probe_m416.txt`（历史过程探针）
  - `M web/src/store/cdrQueryV2M636Store.ts`（旧线遗留改动，不回退、不纳入）
- 未跟踪过程文件约 730 个（`bff-m*-*.log/.txt`、`tsc_m*.txt`、`probe_*.txt` 等），一律不 `git add`；本次提交只显式添加 consult 新增文件与目录。
- 提交身份固定：`chenweidaben <chenweidaben@users.noreply.github.com>`。

## 4. 既有工程范式（重建必须严格对齐，就近采样同类文件）

### 4.1 BFF 路由范式
- 模板：`src/bff/routes/academicExchangeV13.ts`。
- 导出 `RouteDef[]`：`{ method, path, auth: true, handle: async (c: Ctx): Promise<Response> => {...} }`。
- 响应封装：`import { type Ctx, json, ok, type RouteDef } from "../types.js"`；成功 `json(ok(payload))`；失败 `json(fail(ErrorCode.BAD_REQUEST, 'msg', c.traceId), 400)`。
- 路由挂载：`src/bff/server.ts` 顶部 `import { xxxRoutes } from './routes/xxx'`，在 `const allRoutes: RouteDef[] = [ ..., ...xxxRoutes ]` 展开。

### 4.2 权限码
- 守卫：`src/bff/middleware/auth.ts` → `requirePermissionCode(c: Ctx, code: string): Response | null`；返回 `null` 放行，否则返回 401（未登录）/403（权限不足）；`c.user.roles.includes('admin')` 一律放行。
- 登记：`src/bff/permissions.ts` 按模块定义 `XXX_PERMISSIONS` 常量对象 + 联合类型 + `ALL_XXX_PERMISSION_CODES` 数组。
- consult 拟用权限码：`consult-agent:read` / `consult-agent:write` / `consult-agent:audit`。

### 4.3 幂等
- 中间件：`src/bff/middleware/idempotency.ts`；写请求携带 `Idempotency-Key` 头（8–200 字符，推荐 UUID）；无该头不改变既有行为；同键复用到不同请求体返回冲突错误。

### 4.4 审计
- `src/bff/middleware/audit.ts`：`auditOperation(c: Ctx): void` fire-and-forget；`recordOperationLog(c, db?)` 落 `audit.operation_log`；`maskBody` 脱敏后入库；`DEMO_MODE=1` 跳过 DB 写库；审计异常不阻断主请求。

### 4.5 SSE 流式
- 模板：`src/bff/routes/medmuseStream.ts`、`chat.ts`、`assistantLlmChat.ts`。
- 响应头 `SSE_HEADERS`：`Content-Type: text/event-stream; charset=utf-8`、`Cache-Control: no-cache, no-transform`、`Connection: keep-alive`、`X-Accel-Buffering: no`。
- 实现：`new ReadableStream<Uint8Array>` + `TextEncoder`，逐帧 `data: {json}\n\n`，结束帧 `data: [DONE]`；流路由前端不带 `Idempotency-Key`，避免缓冲重序列化收干流。
- 医疗安全：演示文本固定附免责声明；不执行未经审批的写操作/工具。

### 4.6 数据访问层
- 模板：`src/db/repositories/consultRequestRepo.ts`。
- `import { getDb } from '../pool.js'`；接口定义字段驼峰；`create/listXxx/update` 用 `db\`...RETURNING *\``；`mapRow` 蛇形转驼峰。
- DB 执行器签名来自 `src/db/pool.ts` 的 `DbExecutor`；`DEMO_MODE` 下无真实连接。

### 4.7 迁移 SQL
- 目录：`deploy/postgres/init/`，当前最大编号 **99**；consult 重建迁移从 **100** 起编号（不复用旧沙箱 372–377）。
- 模板：`deploy/postgres/init/99-nursing-risk-warning.sql`。
- 规范：`CREATE TABLE IF NOT EXISTS <schema>.<table>`；主键 `uuid PRIMARY KEY DEFAULT gen_random_uuid()`；状态/类型字段 `CHECK (...)`；`jsonb`；`created_at/updated_at timestamptz DEFAULT now()`；`set_updated_at()` 触发器；头部注释含医疗安全红线、权限码、幂等说明与 `Copyright (c) 2026 杭州健澜科技有限公司`；语句幂等可重入。

### 4.8 前端范式
- 服务层：`web/src/services/api/aiConversation.ts`；`import { get, post } from '../request'`；`tokenStorage`、`getCsrfToken`、`env`；定义 View 接口与 SSE 事件类型；真实模式直连 BFF，错误经 `onError` 上报，不本地编造回复。
- 权限包裹：`web/src/router/guards.tsx` → `<RequirePermission permission="consult-agent:read">`；`useAuthStore(s => s.hasPermission)`；无权限跳 `/403`。
- 路由注册：`web/src/router/index.tsx`；登录态 `AuthGuard` 包裹。

### 4.9 测试范式
- `import { describe, expect, it } from "bun:test"`；相对路径 `../../src/...`；既测纯函数聚合器，也实例化路由断言状态码与载荷；断言风格 `expect(x).toBe(...)` / `expect(...).rejects`。
- 目录：`tests/unit/`、`tests/security/`、`tests/integration/`。

## 5. 合规红线（重建代码必须满足）
- 产品正式名称固定为「**健澜AI原生医院操作系统OS**」；交付树内禁止出现旧称「杠OS / 健澜科技杠OS / Gang-OS / jianlan-gang-os / gang-os」（主干历史文件遗留旧称不在本次 consult 新增范围内改动，列入遗留清单，不污染主干提交）。
- 急症 `ESCALATED` 旁路优先；SSE 可下发 `safety:acute` 帧；免责声明常驻前端与回复载荷。
- 诊断/处方草稿 `needsPhysicianReview: true`；处方 `isOutOfHospitalPrescription: false`（zod 字面量强制）；AI 不自主开医嘱。
- 写操作三件套：权限码 + `appendAudit/auditOperation` 审计 + `Idempotency-Key` 幂等校验。
- LLM 凭证仅来自 `process.env`；无凭证走确定性引导文案，不联网、不产生临床结论。
- 工具调用审计只留工具名/状态/耗时/证据数/错误分类，不回显原始入参明文。

## 6. 待决策项（重建启动前确认）
1. 重建规格：完整复刻旧 M86 全套（四角色 Supervisor/Examiner/Doctor/Pharmacist、双层记忆、Sentinel 审批、急症旁路、11 端点、React 对话页、6 迁移、单元/安全/集成测试、配套文档）vs 最小可用闭环（MVP）。
2. 推送范围：仅 GitCode 两仓（JLMEDAIOS + HEAGENTOS）vs 同时同步 GitHub `mirror`。
3. HEAGENTOS 落地策略：`force-main` 覆盖占位 README（新空仓推荐）/ `graft-main` 保留占位 README 单次导入 / `branch` 独立分支 `consult-agent` 不动 main。

## 7. 重建验收基线（严格门禁顺序）
1. 文档先行：需求/架构/契约/数据模型/状态机/测试策略/里程碑落 `docs/consult-agent/`。
2. 编码：核心编排 → 四角色 → 状态机/意图/急症旁路 → 双层记忆 → 工具注册表 → Sentinel/审计 → BFF/SSE → 前端服务层与页面 → 迁移 100–105。
3. 测试：单元（编排/状态机/角色/记忆/工具/哨兵/路由/免责声明/类型校验）、安全权限（读/写/审计权限码 + 未登录/越权）、集成 E2E（会话创建 → 问诊 → 草稿 → 急症旁路 → 审计/幂等回放）。
4. 静态门禁：根 `tsc --noEmit` exit 0；新增改动 ESLint `--max-warnings 0`；Prettier `--check` 通过；`bun:test` 新增用例全绿。
5. 提交：conventional commit 分组（feat / test / docs / chore），仅显式 add consult 新增文件。
6. 推送：先 `--dry-run` 预检 → 推送 → `git ls-remote` 逐位核对本地 HEAD 与远端 SHA 一致；不一致即停止、不重复 force。
