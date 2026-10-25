# consult-agent M86 里程碑计划

> Copyright (c) 2026 杭州健澜科技有限公司
>
> 所属产品：**健澜AI原生医院操作系统OS**。
> 里程碑范围、分片划分、验收门禁以冻结契约 `reports/consult-rebuild/CONTRACT-m86.md`
> §0、§15、§16、§17 与基线勘查档案 `reports/consult-rebuild/baseline-survey.md` §7 为准。

## 1. 里程碑目标

在本机分支 `consult-agent-m86`（基线 `3f019078`）完整重建 consult-agent 子系统：四角色编排、双层记忆、工具注册表、Sentinel 审批网关、急症旁路、BFF 12 个 handler、SSE 流式与回放、六表迁移、React 对话页、单元/安全/集成测试与配套文档；全程满足医疗安全红线、权限三件套与可追溯要求。

## 2. 范围清单（契约 §0 目录落点）

| 域 | 落点 |
|---|---|
| 核心包 | `src/core/agent/consult/`（类型/端口/状态机/意图/哈希/角色共享/Supervisor/编排器/四角色/审计/LLM/记忆/运行时/安全/哨兵/工具/演示种子/聚合导出） |
| BFF | `src/bff/routes/consultAgentRoutes.ts`；`src/bff/permissions.ts` 末尾追加权限登记；`src/bff/server.ts` 末尾挂载路由 |
| 仓储 | `src/db/repositories/consultAgentRepo.ts` |
| 迁移 | `deploy/postgres/init/380-consult-threads.sql`（`consult.threads`）、`381-consult-messages.sql`（`consult.messages`）、`382-consult-documents.sql`（`consult.documents`）、`383-consult-drafts.sql`（`consult.diagnosis_prescription_drafts`）、`384-consult-audit-trail.sql`（`consult.audit_trail`）、`385-consult-profile-memory.sql`（`consult.profile_memory`）；schema `consult`，末段权限种子 |
| 前端 | `web/src/services/api/consultAgent.ts`；`web/src/pages/consult-agent/ConsultAgentChatPage.tsx`；`web/src/router/index.tsx` 路由注册 |
| 测试 | `tests/unit/consult-agent/`、`tests/security/consult-agent/`、`tests/integration/consult-agent/` |
| 文档 | `docs/consult-agent/`；`docs/api/consult-agent-openapi.yaml` |

## 3. 分片计划

| 分片 | 职责 | 产物 | 前置依赖 | 验收要点 |
|---|---|---|---|---|
| **A 文档** | 需求、架构、契约、数据模型、状态机、测试策略、里程碑、README、OpenAPI 规范 | `docs/consult-agent/01..07` + `README.md`；`docs/api/consult-agent-openapi.yaml` | 冻结契约 | Prettier `--check` 通过；旧称 grep 零命中；枚举/字段/路径/权限码与契约逐字一致；OpenAPI 12 端点、9 必备 schema、8 类 SSE 事件 |
| **B 核心** | 核心包全部领域逻辑：types/ports/stateMachine/intentClassifier/draftHash/roleSupport/supervisor/consultOrchestrator/roles/audit/llm/memory/runtime/safety/sentinel/tools/demo/index | `src/core/agent/consult/` 文件树（契约 §0 顶层职责不得增删） | A 文档 | 纯函数确定性；急症旁路先于角色；草稿字面量强制；工具审计不含入参明文；`tsc --noEmit` exit 0 |
| **C 迁移** | 六表 DDL（编号 380–385）+ 权限种子 | `380-consult-threads.sql`、`381-consult-messages.sql`、`382-consult-documents.sql`、`383-consult-drafts.sql`、`384-consult-audit-trail.sql`、`385-consult-profile-memory.sql`（`deploy/postgres/init/`） | A 文档 | CHECK 约束、索引、唯一约束、触发器与契约 §13 一致；语句幂等可重入；头部注释含红线/权限码/幂等/Copyright |
| **D BFF** | 12 个 handler、权限登记、路由挂载、仓储实现、SSE 帧组装与回放 | `consultAgentRoutes.ts`、`consultAgentRepo.ts`、`permissions.ts` 追加段、`server.ts` 挂载 | B 核心、C 迁移 | 写操作三件套；流端点不挂幂等；错误信封 `code/message/data/traceId`；DEMO_MODE 短路内存 |
| **E 前端** | 服务层、对话页、路由注册 | `consultAgent.ts`、`ConsultAgentChatPage.tsx`、路由 lazy + `RequirePermission` | D BFF | 12 个服务函数齐备；SSE 八类 handler；深海蓝 `#0B3D6B` / 辅助背景 `#E8F0F8`；免责声明常驻；工具卡片不展示入参；错误经 `onError` 上报 |
| **F 测试门禁** | 单元/安全/集成用例补齐并收口全量静态门禁 | `tests/unit/consult-agent/`、`tests/security/consult-agent/`、`tests/integration/consult-agent/` | B、C、D、E | 状态机/意图/急症词表/四角色/编排/双层记忆/工具注册表/哨兵去重/草稿哈希/免责声明/类型校验/演示种子用例全绿；权限矩阵 401/403 全绿；E2E 主流程/急症旁路/审计幂等回放全绿；`tsc` / `eslint --max-warnings 0` / `prettier --check` / `bun test` 依次通过 |
| **G 提交推送** | conventional commit 分组提交、GitCode 两仓推送、SHA 逐位核对 | 仅 consult 新增文件显式 add；不触碰既有未跟踪日志与两个已跟踪改动文件 | A–F 全绿 | 提交身份 `chenweidaben <chenweidaben@users.noreply.github.com>`；仅推 `gitcode`（JLMEDAIOS master fast-forward）与 `heagentos`（HEAGENTOS main force-main 覆盖占位 README）；GitHub `mirror` 本次不推；`origin` 内嵌 token 不沿用/不回显；推送前 `--dry-run`，推送后 `git ls-remote` 逐位比对 |

## 4. 验收门禁清单（基线 §7，顺序固定）

1. **文档先行**：需求 / 架构 / 契约 / 数据模型 / 状态机 / 测试策略 / 里程碑落 `docs/consult-agent/`；OpenAPI 落 `docs/api/consult-agent-openapi.yaml`。
2. **编码顺序**：核心编排 → 四角色 → 状态机/意图/急症旁路 → 双层记忆 → 工具注册表 → Sentinel/审计 → BFF/SSE → 前端服务层与页面 → 迁移 380–385。
3. **测试分层**：
   - 单元：编排 / 状态机 / 角色 / 记忆 / 工具 / 哨兵 / 路由 / 免责声明 / 类型校验；
   - 安全：读 / 写 / 审计权限码 + 未登录 401 / 越权 403；
   - 集成 E2E：会话创建 → 问诊 → 草稿 → 急症旁路 → 审计 / 幂等回放。
4. **静态门禁**（契约 §16）：
   - `node_modules\.bin\tsc.cmd --noEmit` exit 0；
   - `node_modules\.bin\eslint.cmd <新增文件...> --max-warnings 0`；
   - `node_modules\.bin\prettier.cmd --check <新增文件...>`；
   - `& "C:\Users\lenovo\.bun\bin\bun.exe" test tests/unit/consult-agent tests/security/consult-agent tests/integration/consult-agent` 全绿。
5. **提交**：conventional commit 分组（`feat(consult-agent):` 源码、`test(consult-agent):` 测试、`docs(consult-agent):` 文档/里程碑、`chore(consult-agent):` 过程脚本）；只显式 add consult 新增文件与目录。
6. **推送**：先 `--dry-run` 预检 → 推送 → `git ls-remote` 把本地 HEAD SHA 与两个远端 SHA 逐位比对；不一致即停止、报告，不重复 force。

## 5. 合规自检清单（契约 §15）

- [ ] 新增交付树内契约 §15.1 列明的全部旧称变体（含大小写/连字符变体）零命中；产品名仅用「健澜AI原生医院操作系统OS」。
- [ ] 急症 `escalated` 旁路优先于角色编排；SSE 可下发 `safety:acute` 帧；免责声明常驻前端与回复载荷。
- [ ] 诊断/处方草稿 `needsPhysicianReview: true`；处方 `isOutOfHospitalPrescription: false`（zod 字面量强制）；AI 不自主开医嘱、不直接产出在院事务。
- [ ] 写操作三件套：权限码 + 审计留痕 + `Idempotency-Key` 幂等校验。
- [ ] 工具调用审计只留工具名/状态/耗时/证据数/错误分类，不回显原始入参明文。
- [ ] 角色 `safeLlm` 降级时审计归属正确；四角色审计透传 `traceId`。
- [ ] LLM 凭证仅取 `process.env`；无凭证确定性降级；不联网、不产生临床结论。

## 6. 遗留旧称说明（契约 §15.8、§17）

- 主干历史文件（`package.json`、README 等）中可能存在的旧称属于历史遗留，**不在本次 M86 改动范围**；本次仅保证 consult 新增代码、文档与迁移零旧称。
- 工作区既有改动 `probe_m416.txt`、`web/src/store/cdrQueryV2M636Store.ts` 保持原样、不纳入提交；约 730 个未跟踪过程日志/探针 txt 一律不 `git add`（契约 §17、基线 §3）。
- 遗留旧称清单由 G 分片在交付报告中如实列出，不回退、不批量改写主干历史文件。

## 7. 不在本次范围

- 真实 LLM 联网推理、真实语音识别转写、第三方药品/相互作用库实时联网。
- 在院医嘱开具、院外处方签发、与 HIS/EMR/LIS/PACS 的在线写回。
- GitHub `mirror` 仓库推送；`origin` 内嵌 token 配置沿用或回显。
- 主干历史文件旧称清理与既有未跟踪过程文件归档。
