# 健澜AI原生医院操作系统OS · consult-agent 多角色医疗问诊智能体交付验证报告（M86）

| 项目 | 口径 |
|---|---|
| 产品正式名称 | 健澜AI原生医院操作系统OS |
| 子系统 | consult-agent 在线咨询智能体（M86 里程碑，四角色多角色问诊编排） |
| 仓库分支 | `consult-agent-m86` |
| 基线提交 | `3f0190788ce05fd7231bbefb68618cecccbc470e`（与 GitCode JLMEDAIOS master、GitHub mirror master 一致） |
| 主推送基线 HEAD | `ece20607e12b03618d77e1b8e33671eb9343e94e`（28 个本地提交，详见 §2） |
| 终态 HEAD（第六轮推送后实测） | `b0ea667828645628b8ab42accf2a5931603e21af`（两仓 `git ls-remote` 逐位一致；各轮中间 SHA 见 §8.5、§8.6） |
| 提交身份 | `chenweidaben <chenweidaben@users.noreply.github.com>`（全部分支提交单一作者，已 `git log --format="%an <%ae>" | Sort-Object -Unique` 复核） |
| 报告日期 | 2026-10-25（Asia/Shanghai） |
| 测试环境 | Windows 本机；node v22.23.2、npm 10.9.8、bun 1.2.0；`DEMO_MODE=1`；无 LLM 凭证走确定性引导文案，不联网、不产生临床结论 |

> 本报告仅记录本机实测命令、退出码与命中计数；未执行的环境项在 §9 如实标注，不以估算覆盖率或历史口径充数。

## 1. 交付范围与决策口径

### 1.1 本次重建范围（冻结 M86 规格）

- 后端核心：四角色编排（Supervisor 分诊编排、Examiner 追问澄清、Doctor 诊断建议草稿、Pharmacist 用药审方草稿）、双层记忆（短期会话 checkpoint + 长期患者画像）、Sentinel 审批网关、急症词表与旁路、工具注册表（驼峰规范名 + 旧下划线别名兼容 + 参数归一化 + 证据抽取分类）、草稿稳定哈希（剔除审核状态/时间戳/记录 ID 后计算 SHA-256）、审计留痕、确定性 LLM 降级。
- BFF：`/api/v1/consult-agent` 前缀 12 个端点（含 SSE 实时流与 SSE 回放），三档权限码 `consult-agent:read / write / audit`，写操作三件套（权限码 + 全局幂等 + 审计留痕）。
- 前端：服务层 12 个函数 + React 对话页，`RequirePermission permission="consult-agent:read"` 包裹，SSE 八类事件映射，免责声明常驻，急症红色提示常驻。
- 迁移：`deploy/postgres/init/380`–`385` 六张 `consult` schema 表，幂等 DDL。
- 测试：单元 13 个测试文件 + 夹具、安全权限 1 个文件、集成 E2E 1 个文件。
- 文档：`docs/consult-agent/` 8 份 Markdown、`docs/api/consult-agent-openapi.yaml`（12 个操作）。

### 1.2 三项已拍板决策（不再询问用户）

1. 完整复刻旧 M86 全套规格（四角色、双层记忆、Sentinel 审批、急症旁路、12 个 BFF/SSE 端点、React 对话页、6 张迁移表、单元/安全/集成测试、配套文档与 OpenAPI）。
2. 仅推送 GitCode 两个仓库：JLMEDAIOS 旧仓 `master` 普通 fast-forward（禁止 force）；HEAGENTOS 新仓 `main` force-main 覆盖占位 README；GitHub mirror 本轮禁止推送、只做只读核对。
3. HEAGENTOS 为新空仓、与主干无共同祖先，`main` 执行 force-main 覆盖占位 README。

### 1.3 编号口径勘误

基线档案初拟迁移编号 100–105，实测 `deploy/postgres/init` 已占用编号 1–371（100–105 前缀早已被占用），旧沙箱 372–377 按禁令不复用；consult 六表改入空闲段 **380–385**，口径已在 `docs/consult-agent/07-milestone-m86.md` 注明。

## 2. 提交分层与 diff 规模

### 2.1 分层原则

- `feat(consult-agent)` / `style(consult-agent)`：consult 功能源码与格式收口，只含 consult 交付物。
- `fix(bff-security)` / `fix(brand)` / `fix(web-router)` / `chore(deploy)`：另一路架构审计与品牌整改，独立成组、独立验证，不混入 consult 功能提交。
- `chore(ignore)`：历史探针/过程日志取消跟踪与忽略规则，仓库卫生独立成组。
- `docs(audit)` / `docs(consult-rebuild)`：审计整改报告、巡检简报与重建底稿留档，独立成组。

### 2.2 28 个提交全表（`git log master..HEAD` 实测，按最新到最旧；规模为 `git log --numstat` 实测）

| # | SHA | 分组 / 主题 | 归属 | 文件 | +增 / −删 |
|---:|---|---|---|---:|---|
| 1 | `ece20607` | `docs(audit)` 终态快照对齐与提交清单收口 | 另一路留档 | 1 | +10 / −6 |
| 2 | `2d19f4dd` | `docs(audit)` 巡检简报终态快照口径归档（推送前收口） | 本轮简报留档 | 1 | +7 / −4 |
| 3 | `6c72ce4e` | `docs(audit)` 巡检简报 24 提交快照口径回填 | 本轮简报留档 | 1 | +17 / −16 |
| 4 | `ee4a45f2` | `docs(audit)` 巡检简报 23 提交快照口径回填 | 本轮简报留档 | 1 | +20 / −17 |
| 5 | `7b411dc7` | `docs(audit)` 21:22 巡检简报收口复核证据口径回填 | 本轮简报留档 | 1 | +9 / −9 |
| 6 | `c62643f1` | `docs(audit)` 并发终态快照对齐与提交清单收口 | 另一路留档 | 1 | +8 / −6 |
| 7 | `db7570d5` | `docs(audit)` 21:22 巡检简报终态口径回填（20 提交快照对齐） | 本轮简报留档 | 1 | +25 / −24 |
| 8 | `b1c3e951` | `docs(audit)` 并发快照口径对齐与提交清单结构收口 | 另一路留档 | 1 | +13 / −9 |
| 9 | `8bd82b3d` | `docs(audit)` 21:22 第五轮滚动巡检简报归档 | 本轮简报留档 | 1 | +164 / −0 |
| 10 | `37d726f0` | `docs(audit)` 取证聚合口径回填与终轮提交快照对齐 | 另一路留档 | 2 | +170 / −71 |
| 11 | `9f85d86d` | `docs(audit)` 第三轮滚动巡检简报归档 | 另一路简报留档 | 1 | +190 / −0 |
| 12 | `c2ec48f2` | `docs(consult-rebuild)` F 分片报告与终轮 post-commit 认证门禁留证回填 | 重建留档 | 2 | +28 / −17 |
| 13 | `5e2ad2ff` | `docs(consult-rebuild)` 合并审计报告终轮口径回填 | 重建留档 | 1 | +12 / −10 |
| 14 | `219c29b4` | `docs(consult-rebuild)` F 分片报告 §7.3 交付认证终轮 post5 门禁证据回填 | 重建留档 | 2 | +65 / −20 |
| 15 | `80cbd3cf` | `docs(consult-rebuild)` 收口口径回填与终轮门禁留证 | 重建留档 | 3 | +80 / −56 |
| 16 | `749d529d` | `fix(brand)` `.dockerignore` / `web/.dockerignore` 头部旧称收口 | 另一路品牌 | 2 | +2 / −2 |
| 17 | `d3d4b696` | `docs(consult-rebuild)` F 分片报告、门禁留证与 20:09 巡检记录回填 | 重建留档 | 3 | +240 / −38 |
| 18 | `73a2b2ae` | `fix(brand)` 在线问候兜底文案产品名收口（`server.ts` 单 hunk，非 consult 改动） | 另一路品牌 | 1 | +1 / −1 |
| 19 | `44fe568b` | `style(consult-agent)` G10 Prettier 格式收口 `sessionRuntime.ts` 并回填留证 | consult 格式收口 | 4 | +60 / −9 |
| 20 | `f238cbba` | `docs(audit)` 终轮门禁口径回填与 F1/F2 基线失败提交后留证 | 另一路留档 | 3 | +59 / −28 |
| 21 | `256cbcdd` | `docs(consult-rebuild)` 五组提交落地后现场复核留证 | 重建留档 | 2 | +80 / −9 |
| 22 | `ea1fe58f` | `docs(audit)` 2026-10-25 架构与全栈审计整改报告及取证归档 | 另一路留档 | 33 | +6705 / −0 |
| 23 | `65802b20` | `chore(ignore)` 临时探针产物去索引并补齐忽略规则（本地文件保留） | 仓库卫生 | 658 | +38 / −35171 |
| 24 | `db3ace9f` | `chore(deploy)` 编排/旁路配置安全加固、密钥参数化与 README 口径对齐 | 另一路整改 | 27 | +1680 / −237 |
| 25 | `378f9928` | `fix(web-router)` 重复挂载去重、失效权限码更正、类型债修复与遗漏页面入库 | 另一路整改 | 7 | +235 / −22 |
| 26 | `3985342a` | `fix(brand)` 品牌合规收口（正式名、包元数据、文档、展示串与镜像标签） | 另一路品牌 | 51 | +96 / −95 |
| 27 | `b5ecf42e` | `fix(bff-security)` 生产 fail-closed 加固、路由顺序与错误契约修复 | 另一路整改 | 11 | +342 / −46 |
| 28 | `42c98a3d` | `feat(consult-agent)` M86 在线咨询智能体全链路（BFF 编排/路由/仓储 + 前端 + SQL/文档/测试） | consult 功能 | 62 | +10459 / −0 |

### 2.3 分组规模汇总（实测）

| 分组 | 提交 | 文件 | +增 / −删 | 说明 |
|---|---|---:|---|---|
| consult 功能源码 | `42c98a3d` feat、`44fe568b` style | 62 + 4 | +10519 / −9 | feat 提交零删除；style 提交源码仅 `sessionRuntime.ts` 一处折行格式收口，同组夹带 3 份 reports 底稿（分组纯度小瑕疵，见 §11.1） |
| 另一路架构/品牌整改 | `b5ecf42e`、`3985342a`、`378f9928`、`db3ace9f`、`73a2b2ae`、`749d529d` | 99 | +2356 / −403 | 独立分组、独立回归验证（§6.2），不混入 consult 功能提交 |
| 仓库卫生 | `65802b20` | 658 | +38 / −35171 | 656 个历史探针/过程 txt/csv/构建日志取消跟踪；零 consult 路径 |
| 审计/简报/底稿留档 | 其余 19 个 docs 提交 | 122 | +8353 / −335 | 仅 `reports/` 留档与巡检简报，无产品源码 |

### 2.4 分支累计 diff（`git diff --shortstat 3f019078 ece20607` 实测，主推送快照）

- **854 files changed, 20466 insertions(+), 35574 deletions(−)**；按状态：新增 A=106、修改 M=89、删除 D=656、重命名 R=3。
- D=656 全部为历史探针/过程日志取消跟踪（`chore(ignore)` 组）；R=3 为运维资产由旧名重命名迁入（内部旧称残留见 §10.1，归属另一路品牌组）。

### 2.5 follow-up docs 提交（主推送 `ece20607` 之上，全部零源码改动）

| SHA | 分组 / 主题 | 文件 | +增 / −删 | 归属 |
|---|---|---:|---|---|
| `d81efc69` | `docs(audit)` 审计报告并发清单 8 组口径与推送后只读快照回填 | 1 | +8 / −6 | 另一路审计留档 |
| `38a11cd8` | `docs(consult-agent)` M86 交付验证报告归档（本报告首版） | 1 | +427 / −0 | consult 交付文档 |
| `92c5a416` | `docs(audit)` 22:10 第六轮巡检简报归档（门禁/测试/合规/SHA 复核留证） | 1 | +209 / −0 | 巡检留档 |
| `f6b33c41` | `docs(audit)` HEAD 谱系与远端实测口径终轮回填 | 1 | +13 / −10 | 另一路审计留档 |
| `c83379c5` | `docs(consult-agent)` 交付验证报告二次推送 SHA 核对与 follow-up 清单回填 | 1 | +33 / −11 | consult 交付文档 |
| `fc7fd956` | `docs(consult-agent)` 报告 §8.6 第三轮终态 SHA 核对表回填 | 1 | +11 / −6 | consult 交付文档 |
| `40783060` | `docs(consult-agent)` 报告 §8.6 第四轮终态 SHA 核对记录回填 | 1 | +14 / −3 | consult 交付文档 |
| `435160ef` | `docs(audit)` 远端最新谱系与并发清单终轮对齐 | 1 | +16 / −11 | 另一路审计留档 |
| `b0ea6678` | `docs(consult-agent)` 报告 follow-up 清单与终轮门禁留证口径回填 | 1 | +7 / −4 | consult 交付文档 |

> 九个 follow-up 提交仅触及 `reports/` 留档与本报告，未改 `src/`、`web/`、`tests/`、`deploy/` 任何产品源码；`git diff ece20607 HEAD -- src web tests deploy package.json bun.lock` 实测为空（docs-only 已复核）。

## 3. consult-agent 交付物清单（feat 提交 `42c98a3d`，62 文件 +10459/0）

### 3.1 后端核心 `src/core/agent/consult/`（26 个 TypeScript 文件）

| 文件 | 行数 | 职责 |
|---|---:|---|
| `types.ts` | 236 | 实体/草稿/状态类型与 zod 红线字面量（`needsPhysicianReview: true`、`isOutOfHospitalPrescription: false`、`status: 'pending_review'`） |
| `ports.ts` | 78 | 仓储/记忆/LLM/工具等端口接口定义 |
| `stateMachine.ts` | 32 | 会话状态机（created → active → escalated / finished / exited） |
| `intentClassifier.ts` | 106 | 用户意图分类（问诊/急症/追问/退出/转写等） |
| `draftHash.ts` | 78 | 草稿稳定业务字段 SHA-256，剔除审核状态/时间戳/记录 ID |
| `roleSupport.ts` | 60 | 角色共享工具函数 |
| `supervisor.ts` | 49 | 分诊 supervisor 编排入口 |
| `consultOrchestrator.ts` | 359 | 编排器主流程：急症旁路优先、角色调度、草稿组装、SSE 帧下发、审计透传 traceId |
| `index.ts` | 103 | 对外导出与组装 |
| `roles/supervisorRole.ts` | 64 | Supervisor 分诊编排角色 |
| `roles/examinerRole.ts` | 75 | Examiner 追问澄清角色 |
| `roles/doctorRole.ts` | 125 | Doctor 诊断建议草稿角色 |
| `roles/pharmacistRole.ts` | 149 | Pharmacist 用药审方草稿角色 |
| `roles/internal.ts` | 77 | 角色内部共享结构 |
| `roles/index.ts` | 32 | 角色注册表 |
| `audit/index.ts` | 87 | 审计条目组装：仅留工具名/状态/耗时/证据数/错误类/脱敏摘要，正则剔除原始入参键 |
| `llm/safeLlm.ts` | 49 | 凭证仅取 `process.env`；无凭证走确定性引导文案，不联网 |
| `memory/shortTermMemory.ts` | 38 | 短期会话 checkpoint 记忆 |
| `memory/profileMemory.ts` | 119 | 长期患者画像记忆 |
| `runtime/sessionRuntime.ts` | 151 | 会话运行时状态与权限上下文 |
| `safety/acuteVocabulary.ts` | 76 | 急症词表与命中匹配 |
| `safety/safetyGate.ts` | 48 | 安全门：急症判定与旁路决策 |
| `sentinel/sentinelGateway.ts` | 62 | Sentinel 审批网关 + 稳定草稿哈希去重 |
| `tools/toolRegistry.ts` | 286 | 工具注册表：规范驼峰名 + 旧下划线别名兼容 + 参数归一化 |
| `tools/evidenceExtractor.ts` | 46 | 证据抽取与分类 |
| `demo/demoSeed.ts` | 115 | 演示种子数据与确定性引导文案 |

### 3.2 BFF 与仓储

| 文件 | 行数 | 职责 |
|---|---:|---|
| `src/bff/routes/consultAgentRoutes.ts` | 520 | 12 个端点路由；12 个 `requirePermissionCode` 细粒度守卫；SSE 实时流与回放；错误契约统一 |
| `src/db/repositories/consultAgentRepo.ts` | 364 | 会话/消息/文档/草稿/审计/画像六表仓储实现（`createConsultAgentRepo(): ConsultAgentPort`） |
| `src/bff/permissions.ts` | 152 | 三档权限码登记（追加 22 行、零删除；`READ/WRITE/AUDIT` 常量位于 208–210 行） |

> `src/bff/server.ts` 的 consult 挂载两行 hunk（import `consultAgentRoutes`、`allRoutes` 内展开）落在另一路 `b5ecf42e fix(bff-security)`；`web/src/router/index.tsx` 的 consult 路由段（lazy import、`consult-agent/chat` 路由、`RequirePermission` 包裹）落在另一路 `378f9928 fix(web-router)`。两处共享基线 hunk 归属已在 §11.3 留证，未混入 `42c98a3d` feat 提交。

### 3.3 前端

| 文件 | 行数 | 职责 |
|---|---:|---|
| `web/src/services/api/consultAgent.ts` | 493 | 12 个服务函数 + 八类 SSE 事件回调；普通请求走 axios（baseURL 含 `/api/v1`），SSE 走原生 fetch；携带 `Authorization: Bearer` 与 `X-CSRF-Token`；主动 `AbortError` 静默，网络/HTTP/读取错误一律 `onError`，前端不编造回复 |
| `web/src/pages/consult-agent/ConsultAgentChatPage.tsx` | 863 | 对话页：会话列表、消息气泡、工具折叠卡片（仅露工具名/状态/证据数/耗时/错误类与脱敏摘要，不回显原始入参）、急症常驻红色 Alert、草稿复核/非院外处方标签、免责声明三层落显 |

### 3.4 迁移 SQL（`deploy/postgres/init/`，schema `consult`，380–385）

| 文件 | 行数 | 表 / 要点 |
|---|---:|---|
| `380-consult-threads.sql` | 80 | `consult.threads`：会话主表；三条权限码种子 + 七条角色授权 |
| `381-consult-messages.sql` | 34 | `consult.messages`：消息流水 |
| `382-consult-documents.sql` | 27 | `consult.documents`：会话内引用文档 |
| `383-consult-drafts.sql` | 42 | `consult.diagnosis_prescription_drafts`：三条红线 CHECK 锁定（待医师复核、非院外处方、待复核状态） |
| `384-consult-audit-trail.sql` | 32 | `consult.audit_trail`：审计轨迹 |
| `385-consult-profile-memory.sql` | 24 | `consult.profile_memory`：长期画像记忆 |

### 3.5 测试

| 文件 | 行数 | 用例 / 断言 |
|---|---:|---|
| `tests/security/consult-agent/permissions.test.ts` | 417 | 69 用例 / 177 断言：未登录 401、缺码 403 覆盖全部 12 端点；read/write/audit 三码互相隔离；admin 直通；拒绝路径不落库 |
| `tests/integration/consult-agent/consultFlow.test.ts` | 371 | 7 用例 / 181 断言 E2E：创建会话 → 普通问诊 → 急症旁路 → 用药草稿 → 审计轨迹 → 事件回放（`[DONE]`、重复回放幂等一致）→ 终态 409 |
| `tests/unit/consult-agent/` 13 个测试文件 + `helpers.ts`（84 行） | 合计 979 | 101 用例 / 301 断言：急症词表、演示种子、免责声明、草稿稳定哈希、意图分类、双层记忆、编排器、四角色、安全门、Sentinel、状态机、工具注册表、schema 红线字面量 |

### 3.6 文档与 OpenAPI

| 文件 | 行数 | 内容 |
|---|---:|---|
| `docs/consult-agent/01-requirements.md` | 76 | 需求边界与角色职责 |
| `docs/consult-agent/02-architecture.md` | 138 | 架构分层与组件关系 |
| `docs/consult-agent/03-contract.md` | 211 | 实体类型、SSE 事件、端点契约单一事实来源 |
| `docs/consult-agent/04-data-model.md` | 228 | 六表数据模型与字段约束 |
| `docs/consult-agent/05-state-machine.md` | 123 | 状态机迁移图与终态判定 |
| `docs/consult-agent/06-test-strategy.md` | 165 | 测试分层、覆盖点与缺口口径 |
| `docs/consult-agent/07-milestone-m86.md` | 36 | M86 里程碑与 380–385 编号口径说明 |
| `docs/consult-agent/README.md` | 53 | 子系统索引 |
| `docs/api/consult-agent-openapi.yaml` | 751 | 12 个操作、相对路径挂在 `/api/v1/consult-agent` 前缀下 |

## 4. 契约实现核对

### 4.1 12 端点与权限码（路由实测，与契约 §12 逐项对齐）

| # | 方法 | 路径 | 权限码 | 写操作三件套 |
|---:|---|---|---|---|
| 1 | POST | `/api/v1/consult-agent/threads` | `write` | 全局 `withIdempotency` + 全局 `auditOperation` + 权限码守卫 |
| 2 | GET | `/api/v1/consult-agent/threads` | `read` | 读操作不写库；权限码守卫 |
| 3 | POST | `/api/v1/consult-agent/threads/:threadId/messages` | `write` | 全局幂等 + 审计 + 权限码守卫 |
| 4 | GET | `/api/v1/consult-agent/threads/:threadId/messages` | `read` | 权限码守卫 |
| 5 | POST | `/api/v1/consult-agent/threads/:threadId/transcribe` | `write` | 全局幂等 + 审计 + 权限码守卫 |
| 6 | GET | `/api/v1/consult-agent/threads/:threadId/audit` | `audit` | 权限码守卫 |
| 7 | GET | `/api/v1/consult-agent/rules/snapshot` | `read` | 权限码守卫 |
| 8 | POST | `/api/v1/consult-agent/threads/:threadId/stream` | `write` | 权限码守卫；SSE 实时流不消费 `Idempotency-Key` |
| 9 | GET | `/api/v1/consult-agent/threads/:threadId/stream/replay` | `read` | 权限码守卫；SSE 回放 |
| 10 | GET | `/api/v1/consult-agent/threads/:threadId/drafts/:kind` | `read` | 权限码守卫；`kind ∈ diagnosis / prescription` |
| 11 | GET | `/api/v1/consult-agent/profile` | `read` | 权限码守卫 |
| 12 | POST | `/api/v1/consult-agent/threads/:threadId/exit` | `write` | 全局幂等 + 审计 + 权限码守卫 |

- 权限码分布：`write` 5 个、`read` 6 个、`audit` 1 个；路由内 `requirePermissionCode` 守卫合计 **12** 处（`grep` 实测 12 命中）。
- 全局中间件：`server.ts:6823` `withIdempotency(c, () => handler(c))` 包裹写操作；`server.ts:6839` `auditOperation(ctx)` 全局 fire-and-forget 审计留痕；import 位于 `server.ts:15`、`:20`。

### 4.2 SSE 八类事件（服务层实测映射，与契约 §11 一致）

| 事件 | 回调 | 载荷要点 |
|---|---|---|
| `delta` | `onDelta(text)` | 流式文本增量 |
| `tool`（start/end） | `onTool(event)` | 工具名/状态/耗时/证据数/错误类；不含原始入参 |
| `safety:acute` | `onAcute(payload)` | 急症命中词与引导文案，触发急症旁路 |
| `draft` | `onDraft(draft)` | 诊断/处方草稿（恒待医师复核） |
| `disclaimer` | `onDisclaimer(text)` | 免责声明帧 |
| `meta` | `onMeta(meta)` | 元信息（置信度等） |
| `done` | `onDone(payload)` | 结束帧，附 `[DONE]` |
| `error` | `onError(code, message)` | 网络/HTTP/流错误统一上报 |

### 4.3 前端 12 个服务函数（`consultAgent.ts` 实测导出 12 个）

`createThread`、`listThreads`、`sendMessage`、`listMessages`、`transcribe`、`listAudit`、`getRulesSnapshot`、`streamReply`、`replayEvents`、`getDraft`、`getProfile`、`exitThread`。

> `transcribe`、`listAudit`、`getRulesSnapshot`、`replayEvents`、`getProfile` 已导出但对话页未挂 UI（契约 §14.2 页面范围未要求，预留后续使用，见 §9.5）。

## 5. 门禁命令与退出码（终轮实测，未沿用旧口径）

源码树在主推送 `ece20607` 之后的全部 follow-up docs 提交中逐字节未变（`git diff ece20607 HEAD -- src web tests deploy package.json bun.lock` 为空）；下列退出码为终态 HEAD 干净现场实跑记录，日志留档 `reports/consult-rebuild/G-final2-*.log`（tsc / eslint / prettier / web 三件套 / consult bun / B 类 bun）。

### 5.1 静态门禁

| 门禁 | 命令（工作目录） | 退出码 | 结果 |
|---|---|---:|---|
| 根类型检查 | `node_modules\.bin\tsc.cmd --noEmit`（仓库根） | **0** | 诊断输出为空，无类型错误 |
| ESLint（后端 consult，根配置 `--max-warnings 0`） | `node_modules\.bin\eslint.cmd src/core/agent/consult src/bff/routes/consultAgentRoutes.ts src/db/repositories/consultAgentRepo.ts tests/unit/consult-agent tests/security/consult-agent tests/integration/consult-agent --max-warnings 0` | **0** | 零代码告警；仅 `.eslintignore` 弃用框架提示（非代码告警，不计入 `--max-warnings`） |
| Prettier（后端 consult 全路径） | `node_modules\.bin\prettier.cmd --check "src/core/agent/consult/**/*.ts" "src/bff/routes/consultAgentRoutes.ts" "src/db/repositories/consultAgentRepo.ts" "tests/unit/consult-agent/**/*.ts" "tests/security/consult-agent/**/*.ts" "tests/integration/consult-agent/**/*.ts"` | **0** | `All matched files use Prettier code style!` |
| web 类型检查 | `npx tsc --noEmit`（cwd=`web`，`web/tsconfig.json`） | **0** | 诊断输出为空 |
| ESLint（前端 consult，web 本地配置 `--max-warnings 0`） | `npx eslint src/pages/consult-agent src/services/api/consultAgent.ts --max-warnings 0`（cwd=`web`，加载 `web/eslint.config.js`） | **0** | 零代码告警 |
| Prettier（前端 consult） | `npx prettier --check "src/pages/consult-agent/**/*.tsx" "src/services/api/consultAgent.ts"`（cwd=`web`） | **0** | `All matched files use Prettier code style!` |

### 5.2 测试门禁（`DEMO_MODE=1`，bun 1.2.0）

| 套件 | 命令 | 退出码 | 统计 |
|---|---|---:|---|
| consult 三目录 | `bun test tests/unit/consult-agent tests/security/consult-agent tests/integration/consult-agent` | **0** | **177 pass / 0 fail / 659 expect()，15 文件，12.41s** |
| 另一路 B 类既有测试回归（8 文件） | `bun test tests/unit/apiDocs.test.ts tests/unit/twin3DInpatient.test.ts tests/unit/bff/demoModeGuard.test.ts tests/unit/bff/prodDemoFailClosed.test.ts tests/unit/core/SystemPromptBuilder.test.ts tests/unit/security/audit-report.test.ts tests/unit/security/audit.test.ts tests/unit/security/encryption.test.ts` | **0** | **140 pass / 0 fail / 1143 expect()，8 文件，1.74s** |

### 5.3 前端根配置严格口径（债务单列，不计入 consult 新增）

cwd=根目录、加载根 `eslint.config.js`（`recommendedTypeChecked` + `stylisticTypeChecked`）对前端 consult 两文件跑 ESLint，**EXIT=1**，9 个问题（7 errors / 2 warnings：2 处 `prefer-nullish-coalescing`、5 处 `no-misused-promises`、2 处 import 排序）。归属：E 分片 consult 前端产物在根 type-checked/stylistic 严格规则下的既有规则债；web 本地配置口径 EXIT=0；非本轮新增、非主干既有基线告警，留待前端规则债专项清理（见 §9.3）。

## 6. 测试结果明细

### 6.1 consult 专项（177 pass / 0 fail / 659 expect / 15 文件）

| 套件 | 文件 | 用例 | 断言 |
|---|---|---:|---:|
| 单元 | `tests/unit/consult-agent/` 13 个测试文件 | 101 | 301 |
| 安全 | `tests/security/consult-agent/permissions.test.ts` | 69 | 177 |
| 集成 | `tests/integration/consult-agent/consultFlow.test.ts` | 7 | 181 |
| **合计** | **15** | **177** | **659** |

### 6.2 另一路 B 类回归（140 pass / 0 fail / 1143 expect / 8 文件）

覆盖 `apiDocs`、`twin3DInpatient`、demo 模式守卫、生产 fail-closed、`SystemPromptBuilder`、审计报告、审计中间件、字段加密八组既有逻辑；另一路整改提交（§2.3 分组）未引入回归。

### 6.3 基线遗留失败（非 consult 引入，留证不修复）

终轮复跑 `tests/unit/onlineConsult.test.ts` 与 `tests/unit/db/ddl.test.ts`：**14 pass / 2 fail / 2398 expect()，16 文件，EXIT=1**。失败用例与归属：

| 失败用例 | 文件 | 现状 | 归属判定 |
|---|---|---|---|
| `endConsultation 结束问诊 > 空小结拒绝结束；非咨询中状态拒绝` | `tests/unit/onlineConsult.test.ts` | 9 pass / 1 fail / 38 expect；日期硬编码（2026-10-16 接受时间超出 30 分钟时限） | 基线遗留：源文件相对 HEAD 零改动，非 consult 引入 |
| `PostgreSQL DDL 静态完整性 > 表/序列/触发器/种子全部齐全且自洽` | `tests/unit/db/ddl.test.ts` | 5 pass / 1 fail / 2360 expect；历史 12 个 M 系列 SQL 括号不配平粗检误报；consult 380–385 未列入错误清单 | 基线遗留：非 consult 引入 |

## 7. 合规红线自检（grep 实测证据）

### 7.1 产品名称与旧称

- consult 交付树旧称变体扫描（覆盖连字符 / 无连字符 / 英文大小写 / 中文杠形各写法，大小写不敏感；路径范围：后端核心 26 文件、BFF 路由、仓储、前端两文件、`docs/consult-agent`、OpenAPI、测试三目录、380–385 六表）：**OLD_NAME_HITS=0**。扫描命令与变体清单见 `reports/consult-rebuild/F-brand-grep.log` 留档。
- 产品正式名称「健澜AI原生医院操作系统OS」在 `docs/consult-agent/` 8 份 Markdown 与 OpenAPI 中 **14 处**在位。

### 7.2 医疗安全红线（源码实测）

| 红线 | 实测命中 | 位置 / 说明 |
|---|---:|---|
| 草稿 `needsPhysicianReview: true` | 1 处 | `types.ts` zod 字面量；schema 测试实测 `needsPhysicianReview=false` 被拒绝 |
| 处方 `isOutOfHospitalPrescription: false` | 1 处 | `types.ts` zod 字面量；测试实测 `true` 被拒绝 |
| 草稿 `status: 'pending_review'` | 1 处 | `types.ts` zod 字面量；`approved/rejected` 被拒绝 |
| 急症旁路 `acute_bypass` 审计归属 | 2 处 | `consultOrchestrator.ts`；急症 `escalated` 旁路优先于角色编排，不产草稿 |
| `safety:acute` 帧下发 | 2 处 | `consultOrchestrator.ts`；前端 `onAcute` 常驻红色 Alert，命中词与引导文案落显 |
| 免责声明帧 | 3 处 | `consultOrchestrator.ts` `type: 'disclaimer'`；前端三层落显（页面底部常驻 + 每条 assistant 下方小字 + `meta`/`disclaimer` 帧） |
| AI 不自主开医嘱 / 不产在院事务 | 结构约束 | 草稿恒 `pending_review`；处方恒非院外处方；诊断/处方均为待执业医师复核的辅助建议草稿 |

### 7.3 写操作三件套与审计脱敏

- 权限码：`permissions.ts:208–210` 登记 `consult-agent:read/write/audit`；12 端点按 §4.1 分码守卫。
- 幂等：`server.ts:6823` 全局 `withIdempotency` 包裹写操作；SSE 流路由不消费 `Idempotency-Key`。
- 审计：`server.ts:6839` 全局 `auditOperation` fire-and-forget；consult 业务审计经仓储落 `consult.audit_trail`；审计条目仅留工具名/状态/耗时/证据数/错误类/脱敏摘要，正则剔除 `rawArgs`/`toolArgs`/`args`/`payload` 等原始入参键；集成用例断言键集合白名单，序列化不含原始入参。
- 四角色审计透传 `traceId` 与 `actorRole`；`safeLlm` 降级时审计归属正确。

### 7.4 凭据扫描

- 全分支 diff 令牌模式扫描（`ghp_*`、`AKIA*`、`xox[baprs]-*`、`Bearer <literal>`）：**零命中**。
- 全部 `password` 相关行均为 `CHANGE_ME_*` 占位、`${ENV_VAR:?}` 环境变量读取或注释提示；无硬编码真实口令。LLM 凭证仅来自 `process.env`（`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `DEEPSEEK_API_KEY`），无凭证走确定性引导文案。
- `origin` 历史内嵌 token 的 HTTPS 远端未沿用、未回显、未写入新 remote / 日志 / 提交 / 本报告。

## 8. 推送与远端 SHA 逐位核对

### 8.1 推送策略（本轮锁定）

| 远端 | 地址 | 分支 | 策略 |
|---|---|---|---|
| GitCode JLMEDAIOS | `git@gitcode.com:weixin_46642356/JLMEDAIOS.git` | `master` | 普通 fast-forward，禁止 force（基线 `3f019078` 为 HEAD 祖先，`git merge-base --is-ancestor` EXIT=0） |
| GitCode HEAGENTOS | `git@gitcode.com:weixin_46642356/HEAGENTOS.git` | `main` | force-main 覆盖占位 `9d3f5be1…`（新空仓、无共同祖先） |
| GitHub mirror | `git@github.com:chenweidaben/JLAIharnessos.git` | `master` | **本轮禁止推送**，仅只读核对 |

### 8.2 推送前 dry-run 预检（退出码 0）

- `git push --dry-run gitcode consult-agent-m86:master`：`3f019078..ece20607 consult-agent-m86 -> master`，EXIT=0（fast-forward，无 force）。
- `git push --dry-run --force heagentos consult-agent-m86:main`：`+ 9d3f5be1...ece20607 consult-agent-m86 -> main (forced update)`，EXIT=0。

### 8.3 主推送结果与 SHA 逐位核对

| 仓库 / 分支 | 推送动作 | 远端 SHA（`git ls-remote` 实测） | 本地 HEAD | 逐位比对 |
|---|---|---|---|---|
| GitCode JLMEDAIOS `master` | 普通 fast-forward `3f019078..ece20607`，远端 Hook PASSED | `ece20607e12b03618d77e1b8e33671eb9343e94e` | `ece20607e12b03618d77e1b8e33671eb9343e94e` | **一致** |
| GitCode HEAGENTOS `main` | force-main `+ 9d3f5be1...ece20607 (forced update)`，远端 Hook PASSED | `ece20607e12b03618d77e1b8e33671eb9343e94e` | `ece20607e12b03618d77e1b8e33671eb9343e94e` | **一致** |
| GitHub mirror `master` | 未推送（只读核对） | `3f0190788ce05fd7231bbefb68618cecccbc470e` | — | 保持基线，未变化 |

### 8.4 follow-up 推送安排

主推送 `ece20607` 完成后，follow-up docs 提交分两轮推送：第二轮推送 `d81efc69`、`38a11cd8`、`92c5a416`（二次推送终态 `92c5a416`，核验见 §8.5）；第三轮推送 `f6b33c41` 与本报告终稿回填提交。gitcode `master` 全程普通 fast-forward 不 force；HEAGENTOS `main` 维持 force-main 覆盖口径；GitHub mirror 本轮始终不推送、只读核对。

### 8.5 二次推送 SHA 逐位核对（推送后实测）

二次推送 dry-run（EXIT=0）：`git push --dry-run gitcode consult-agent-m86:master` 输出 `ece20607..92c5a416 consult-agent-m86 -> master`（fast-forward，无 force）；`git push --dry-run --force heagentos consult-agent-m86:main` 输出 `ece20607..92c5a416 consult-agent-m86 -> main`（EXIT=0）。实际推送：gitcode `master` 普通 fast-forward `ece20607..92c5a416`、远端 Hook PASSED；HEAGENTOS `main` force-main 推送、远端 Hook PASSED。

| 仓库 / 分支 | 推送动作 | 远端 SHA（`git ls-remote` 实测） | 本地 HEAD | 逐位比对 |
|---|---|---|---|---|
| GitCode JLMEDAIOS `master` | 普通 fast-forward `ece20607..92c5a416`，Hook PASSED | `92c5a4169ee7e239cdc3e2951352ef27f116f907` | `92c5a4169ee7e239cdc3e2951352ef27f116f907` | **一致** |
| GitCode HEAGENTOS `main` | force-main 推送 `ece20607..92c5a416`，Hook PASSED | `92c5a4169ee7e239cdc3e2951352ef27f116f907` | `92c5a4169ee7e239cdc3e2951352ef27f116f907` | **一致** |
| GitHub mirror `master` | 未推送（只读核对） | `3f0190788ce05fd7231bbefb68618cecccbc470e` | — | 保持基线未变 |

### 8.6 终态 follow-up 推送 SHA 核对（第三轮推送后实测）

第三轮推送 dry-run（EXIT=0）：`git push --dry-run gitcode consult-agent-m86:master` 输出 `92c5a416..c83379c5 consult-agent-m86 -> master`（fast-forward，无 force）；`git push --dry-run --force heagentos consult-agent-m86:main` 输出 `92c5a416..c83379c5 consult-agent-m86 -> main`（EXIT=0）。实际推送：gitcode `master` 普通 fast-forward `92c5a416..c83379c5`、远端 Hook PASSED；HEAGENTOS `main` force-main 推送、远端 Hook PASSED。

| 仓库 / 分支 | 远端 SHA（`git ls-remote` 实测） | 本地 HEAD | 逐位比对 |
|---|---|---|---|
| GitCode JLMEDAIOS `master` | `c83379c51e73b0fe9648b0e76deb9f4c14644fd6` | `c83379c51e73b0fe9648b0e76deb9f4c14644fd6` | **一致** |
| GitCode HEAGENTOS `main` | `c83379c51e73b0fe9648b0e76deb9f4c14644fd6` | `c83379c51e73b0fe9648b0e76deb9f4c14644fd6` | **一致** |
| GitHub mirror `master` | `3f0190788ce05fd7231bbefb68618cecccbc470e` | — | 保持基线未变 |

> 本表回填提交（§8.6 文字落盘）为第四轮 `docs(consult-agent)` 打包提交 `fc7fd956dfc6cd167a6739aebc3824db7100ff1d`，第四轮推送后两仓 `git ls-remote` 实测均为该 SHA，逐位一致（见下表第四轮核对记录）。

#### 第四轮推送核对（`c83379c5..fc7fd956`，推送后实测）

第四轮 dry-run（EXIT=0）：gitcode `master` `c83379c5..fc7fd956` fast-forward（无 force）；HEAGENTOS `main` `c83379c5..fc7fd956` force-main。实际推送两仓 Hook PASSED。

| 仓库 / 分支 | 远端 SHA（`git ls-remote` 实测） | 本地 HEAD | 逐位比对 |
|---|---|---|---|
| GitCode JLMEDAIOS `master` | `fc7fd956dfc6cd167a6739aebc3824db7100ff1d` | `fc7fd956dfc6cd167a6739aebc3824db7100ff1d` | **一致** |
| GitCode HEAGENTOS `main` | `fc7fd956dfc6cd167a6739aebc3824db7100ff1d` | `fc7fd956dfc6cd167a6739aebc3824db7100ff1d` | **一致** |
| GitHub mirror `master` | `3f0190788ce05fd7231bbefb68618cecccbc470e` | — | 保持基线未变 |

#### 第五、六轮终态核对（推送后实测）

第五轮 `fc7fd956..40783060`、第六轮 `40783060..b0ea6678` 均为 gitcode `master` 普通 fast-forward（无 force）、HEAGENTOS `main` force-main；两轮 dry-run EXIT=0，实际推送两仓 Hook PASSED。第五轮核对远端 `4078306088438b2dff0c2b03c13f2c9b039baa83` 与本地一致；第六轮终态 `git ls-remote` 实测如下：

| 仓库 / 分支 | 远端 SHA（`git ls-remote` 实测） | 本地 HEAD | 逐位比对 |
|---|---|---|---|
| GitCode JLMEDAIOS `master` | `b0ea667828645628b8ab42accf2a5931603e21af` | `b0ea667828645628b8ab42accf2a5931603e21af` | **一致** |
| GitCode HEAGENTOS `main` | `b0ea667828645628b8ab42accf2a5931603e21af` | `b0ea667828645628b8ab42accf2a5931603e21af` | **一致** |
| GitHub mirror `master` | `3f0190788ce05fd7231bbefb68618cecccbc470e` | — | 保持基线未变 |

## 9. 未闭环环境缺口（如实标注，未伪造通过）

### 9.1 数据库未真实库演练

- 本机无运行中 PostgreSQL；380–385 六表 DDL 未做真实建表 / 触发器 / 索引 / 约束校验；135 个既有集成用例依赖 PostgreSQL 本机未跑。
- `tests/unit/db/ddl.test.ts` 静态粗检仅覆盖括号配平；consult 六表未列入其错误清单（§6.3）。

### 9.2 LLM 凭证与联调缺口

- 本机无 LLM 凭证，核心链路走确定性引导文案；BFF 与前端未对运行中后端做真实 SSE / HTTP 联调；SSE 断线重连、超时降级、token 计量、浏览器视觉走查未覆盖。

### 9.3 前端规则债（E 分片，非 consult 新增）

- 根配置严格口径 ESLint 9 问题（§5.3）未在本轮消化；`web/src/router/index.tsx` 存在既有 Prettier 历史债务（HEAD 基线即不通过，本次 consult 新增两段在格式化副本中逐字节一致；按"不改其他路由"约束未对该文件 `--write`）。

### 9.4 构建 / 覆盖率未执行

- 全量 `bun test`、`bun run build`、`bun test --coverage` 未执行；本报告不提供估算覆盖率数字。
- `services-java` 本机无 Maven/JVM 未独立构建；`services-python`、`services/radar-inference` 未在本轮验证范围。

### 9.5 前端预留未挂 UI 的服务函数

- `transcribe`、`listAudit`、`getRulesSnapshot`、`replayEvents`、`getProfile` 已导出但页面未挂 UI（契约 §14.2 未要求）；`meta.confidence` 未渲染标签；`onDone.messageId` 未落本地状态。

### 9.6 其他未跑项

- 4 处 `docs/` 旧文件名悬空引用（已删除运维资产的文档路径）由另一路待清；`pgsql/` 189 个 pgAdmin 内嵌 txt 在基线即被跟踪，建议后续 housekeeping 评估忽略与去索引，本轮不纳入 consult 提交。

## 10. 非 consult 旧称残留分类（不计 consult 债务）

### 10.1 B 类：本轮分支已改动、待另一路品牌组继续清理（55 处）

| 文件 | 残留命中 |
|---|---:|
| `deploy/prometheus/rules/jlmedaios.yml`（由旧名重命名迁入，内部规则组名/标题未替换） | 12 |
| `deploy/grafana/dashboards/jlmedaios-overview.json`（由旧名重命名迁入，内部标签/标题未替换） | 16 |
| `docs/architecture/02-技术架构.md` | 12 |
| `docs/architecture/03-开发指南.md` | 7 |
| `docs/architecture/review-1-architect.md` | 5 |
| `docs/architecture/04-迁移路线.md` | 3 |
| **合计** | **55** |

> 两份运维资产由旧名重命名迁入后未就地替换内部旧称，非本轮 consult 新写代码引入；文件在本轮分支改动清单内，归属另一路品牌组继续清理，不记入 consult 债务，也不计为纯基线债务。

### 10.2 C 类：主干基线遗留（本轮零改动，非 consult 引入，52 处）

| 文件 | 残留命中 |
|---|---:|
| `docs/operations/01-监控手册.md` | 12 |
| `docs/operations/02-告警手册.md` | 10 |
| `src/bff/observability/metrics.ts` | 7 |
| `src/core/observability/metrics.ts` | 6 |
| `tests/unit/core/observability/business-metrics.test.ts` | 5 |
| `tests/unit/bff/metrics.test.ts` | 4 |
| `CHANGELOG.md` | 3 |
| `package-lock.json` | 2 |
| `src/knowledge-platform/types.ts` | 1 |
| `src/knowledge-platform/index.ts` | 1 |
| `web/tests/pages/profile/MfaSettings.test.tsx` | 1 |
| **合计** | **52** |

### 10.3 reports 留档说明

`reports/audit-2026-10-25/`、`reports/consult-rebuild/`、`reports/patrol/` 内的旧称命中为审计对照记录与巡检留档，非产品交付代码，不阻塞品牌合规；不混入 consult 产品交付树。

## 11. 排除项与分组纪律留证

### 11.1 分组纯度小瑕疵（已记录，不阻塞）

`44fe568b style(consult-agent)` 除 `sessionRuntime.ts`（4 行折行格式收口，纯格式、无逻辑/签名变更）外，同组夹带 3 份 reports 底稿（审计报告、F-gate-exits、F-shard-report）；按留档口径应归 `docs(consult-rebuild)`。已在提交清单与本节如实记录，后续提交注意 reports 底稿独立成组。

### 11.2 明确排除、未纳入任何 consult 提交的文件

| 文件 / 类别 | 归属处置 | 核验结论 |
|---|---|---|
| `probe_m416.txt` | 已去索引，归 `65802b20 chore(ignore)` | `git ls-files` 为空；工作区保留；未混入 `42c98a3d` |
| `web/src/store/cdrQueryV2M636Store.ts` | 归 `378f9928 fix(web-router)` 一行类型修复 | 未混入 `42c98a3d`；工作区与 HEAD 一致 |
| `.env.example` | 全部归 `db3ace9f chore(deploy)`（无 consult 专属环境变量） | `git show --name-only 42c98a3d` 复核不含该文件 |
| 约 730 个未跟踪过程日志 / 探针 txt / csv | 一律未 `git add` | 未进入任何 consult 提交 |
| `web/build_out.txt`、`web/coverage_out.txt` | 归 `65802b20 chore(ignore)` 去索引与忽略规则 | 非产品交付物 |

### 11.3 共享基线 hunk 归属

- `src/bff/server.ts`：consult 挂载两行 hunk（import `consultAgentRoutes`、`allRoutes` 内 `...consultAgentRoutes` 展开）归 `b5ecf42e fix(bff-security)`；该提交其余 21 行为生产 fail-closed / runtimeEnv / 路由重排加固，属另一路整改。
- `web/src/router/index.tsx`：consult 段（`ConsultAgentChatPage` lazy import、`consult-agent/chat` 路由注册、`RequirePermission permission="consult-agent:read"` 包裹）归 `378f9928 fix(web-router)`；其余 CRLF 存量与另一路菜单/路由改动未纳入 consult 分组。
- `src/bff/permissions.ts`：纯追加 22 行、零删除，整文件纳入 `42c98a3d feat(consult-agent)`。

### 11.4 feat 提交纯度复核（`git show --name-only 42c98a3d`）

`42c98a3d` 62 文件中**不含** `.env.example`、`web/src/store/cdrQueryV2M636Store.ts`、`probe_m416.txt`、`src/bff/server.ts`、`web/src/router/index.tsx`、`package.json`、`docker-compose.yml`、`docker-compose.prod.yml`、`web/package.json`、`bun.lock`；README 模式仅命中 `docs/consult-agent/README.md`（合法 consult 文档）。

## 12. 结论

consult-agent 多角色医疗问诊智能体 M86 全套规格已在本机重建落地并通过终轮静态门禁与专项测试：根 `tsc --noEmit` EXIT=0、后端/前端 consult ESLint 与 Prettier 全绿、consult 专项 **177 pass / 0 fail / 659 expect / 15 文件**、另一路 B 类回归 **140 pass / 0 fail / 1143 expect / 8 文件**；合规红线（旧称零命中、三档权限码、急症旁路、待医师复核草稿、非院外处方、免责声明常驻、审计脱敏、凭据零命中）逐项留证。主推送已完成并逐位核对：GitCode JLMEDAIOS `master` 与 HEAGENTOS `main` 主推送基线均为 `ece20607e12b03618d77e1b8e33671eb9343e94e`；二次至第六轮 follow-up 推送后终态 `b0ea667828645628b8ab42accf2a5931603e21af` 在两仓逐位核对一致（§8.5、§8.6 各轮 SHA 留档）；GitHub mirror 保持基线 `3f019078` 未推送。环境未闭环项（数据库演练、LLM 联调、全量构建与覆盖率、前端规则债等）已在 §9 如实列示，不阻塞本轮 consult 交付收口。
