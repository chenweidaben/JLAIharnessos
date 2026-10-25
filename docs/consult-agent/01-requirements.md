# consult-agent M86 需求规格说明

> Copyright (c) 2026 杭州健澜科技有限公司
>
> 模块：consult-agent（AI 辅助问诊助手）；所属产品：**健澜AI原生医院操作系统OS**。
> 本文档是 M86 重建的需求基线，枚举值、字段名、路径、权限码以冻结契约
> `reports/consult-rebuild/CONTRACT-m86.md` 为单一事实来源；本文不新增契约未定义的需求项。

## 1. 需求背景

### 1.1 业务定位

consult-agent 是健澜AI原生医院操作系统OS 内面向院内医护与患者侧演示场景的 AI 辅助问诊子系统：在会话内完成意图分诊、信息采集、诊断建议草稿、用药审方草稿、急症识别与旁路引导，并全程留痕、待执业医师复核。

子系统严格定位为「辅助」：AI 只产出供医师复核的草稿，不自主确诊、不直接开具在院医嘱、不产生院外处方；急症信号一律旁路到急诊引导流程。

### 1.2 重建背景

旧沙箱内的 consult-agent 源码与本地提交随环境销毁，三个远端仓库均无留存；本机基线分支 `consult-agent-m86`（基线 `3f019078`）按冻结契约在本机重建。重建范围、目录落点、技术范式与合规红线以契约 §0、§15 与基线勘查档案 `reports/consult-rebuild/baseline-survey.md` 为准。

### 1.3 范围边界

- **在范围内**：四角色编排、双层记忆、工具注册表、Sentinel 审批网关、急症旁路、BFF 12 个 handler、SSE 流式与回放、六表迁移、React 对话页、单元/安全/集成测试与配套文档。
- **不在范围内**：真实 LLM 联网推理、真实语音识别转写服务、第三方药品知识库/相互作用数据库实时联网、在院医嘱开具、院外处方签发、与 HIS/EMR/LIS/PACS 的在线写回。上述能力在 M86 仅以确定性 DEMO 实现占位（见 §7 DEMO_MODE 边界）。

## 2. 用户角色

### 2.1 系统内编排角色（`RoleKind`，契约 §1.1）

| 角色 | 枚举值 | 职责 | 典型产出 |
|---|---|---|---|
| Supervisor | `supervisor` | 编排分诊：先交 `safetyGate`（`acute` 由编排层旁路，不进角色），再按意图选择下一个角色；问候场景输出简短引导并维持 `collecting` | 编排级回复 + `nextRole` |
| Examiner | `examiner` | 信息不足时输出 2–4 个结构化追问（`followUpQuestions`），状态导向 `clarifying` | 追问列表；不产草稿 |
| Doctor | `doctor` | 生成诊断建议草稿（`kind=diagnosis`）；证据来自工具结果；措辞为「建议排查/待复核」，禁止确诊结论 | `ConsultDraft`（`diagnosis`）+ evidence + 免责声明 |
| Pharmacist | `pharmacist` | 生成用药审方/处方草稿（`kind=prescription`）；核对过敏、相互作用；禁止直接开具在院医嘱 | `ConsultDraft`（`prescription`）+ 风险提示 + 免责声明 |

### 2.2 登录用户角色（权限归属，契约 §12、§13 末段）

- **admin**：持有 `consult-agent:read`、`consult-agent:write`、`consult-agent:audit` 全量权限。
- **doctor（医师）**：持有 `consult-agent:read` + `consult-agent:write`；可读会话/消息/草稿/画像，可发起会话、发消息、转写、退出。
- **nurse（护士）**：仅持有 `consult-agent:read`。
- **audit 权限**（`consult-agent:audit`）仅授予 admin；用于查看审计轨迹。

> 角色权限映射以编号段 380–385（`deploy/postgres/init/380-consult-threads.sql` … `385-consult-profile-memory.sql`，schema `consult`）迁移末段幂等写入 `iam.permissions` 与角色授权为准；`admin` 角色在 `requirePermissionCode` 守卫中一律放行（基线勘查档案 §4.2）。

### 2.3 角色行为约束

- 四角色审计透传 `traceId` 与自身 `actorRole`；`safeLlm` 降级时审计归属正确，并记录 `degradedLlm: true`（契约 §5、§15.6）。
- Supervisor 不在角色层处理 `acute`；急症旁路由编排层在进入角色编排之前完成（契约 §5、§10）。

## 3. 功能需求

### 3.1 会话与会话管理

- 用户可创建会话（可携带首条消息）；创建返回 `{ thread, messages, draft? }`。
- 用户可查看当前用户的会话列表，返回 `{ threads: ConsultThread[] }`。
- 用户可主动退出/关闭会话；退出返回 `{ thread }`；终态会话拒绝新消息。

### 3.2 消息与意图

- 发送消息（非流式快照），返回 `{ thread, message, draft?, events? }`。
- 意图分类由确定性关键词规则完成（`greeting`、`symptom_report`、`clarification_answer`、`medication_question`、`chronic_management`、`acute_emergency`、`document_upload`、`exit`、`unknown`），不联网；输出 `IntentResult { intent, confidence, matched }`，置信度 0–1，规则可测、可枚举（契约 §3）。
- 语音转写 DEMO：接收 `transcript` / `audioText`（至少其一非空），归一化后返回 `{ text, message? }`。

### 3.3 角色编排

- Supervisor 按意图选角：用药问题 → `pharmacist`；症状主诉信息充分 → `doctor`；信息不足 → `examiner`；问候 → 简短引导并维持 `collecting`。
- Examiner 追问期间状态为 `clarifying`；上一轮 Examiner 追问后，本次补充回答归类为 `clarification_answer`。
- Doctor / Pharmacist 产出草稿后经 Sentinel 审批，状态由 `drafting` 进入 `review_pending`。

### 3.4 工具调用

- 工具注册表维护规范驼峰名与下划线别名兼容；参数归一化（下划线键转驼峰、剔未知键）。
- 内置工具（确定性 DEMO 返回，不联网）：`searchKnowledgeBase`（`search_knowledge_base`）、`lookupDrug`（`lookup_drug`）、`checkAllergy`（`check_allergy`）、`checkInteraction`（`check_interaction`）、`retrievePatientHistory`（`retrieve_patient_history`）。
- 工具审计只留 `name/status/durationMs/evidenceCount/errorClass/summary`，不记录原始入参明文（契约 §6、§15.5）。

### 3.5 草稿与复核

- Doctor 草稿 `kind=diagnosis`；Pharmacist 草稿 `kind=prescription`。
- 所有 AI 草稿恒为 `status='pending_review'`；`needsPhysicianReview=true`（zod 字面量强制）；处方草稿 `isOutOfHospitalPrescription=false`（zod 字面量强制）；不产生 `approved` / `rejected` AI 态（契约 §1.1、§1.2）。
- 草稿内容附证据 `EvidenceItem[]` 与免责声明；Doctor 措辞为「建议排查/待复核」，Pharmacist 附风险提示。

### 3.6 急症识别与旁路

- 急症词表命中即判定 `acute`；编排层优先执行旁路：状态转 `escalated`，发送急症引导系统/assistant 消息，审计 `acute_bypass`，下发 `safety:acute` 事件；不进入角色编排、不产草稿（契约 §4、§10.2）。
- 命中词表见契约 §4.1；`caution` 为含高危但非急危重表述（如长期慢性病急性加重表述），其余为 `normal`。

### 3.7 记忆

- 短期记忆：近期消息滑窗 `recentMessages(history, n=20)`；`checkpoint(threadId, messages)` 供 DEMO 运行时使用。
- 长期画像：`upsertFact(userId, fact)`、`listFacts(userId)`、`mergeFacts(existing, updates)`；事实键例：`allergy`、`chronic_condition`、`drug_intolerance`、`preferred_language`。
- DEMO_MODE 走 `sessionRuntime` 进程内 Map；非 DEMO 由 `consultAgentRepo` 落 `consult.profile_memory`（契约 §7）。

### 3.8 SSE 流式与回放

- 流式端点逐帧下发 `delta` / `tool` / `safety:acute` / `draft` / `disclaimer` / `meta` / `done`，异常下发 `error`；结束帧 `data: [DONE]\n\n`。
- 回放端点按时间顺序重放持久化事件；流路由不消费 `Idempotency-Key`（契约 §11、§12）。

### 3.9 规则快照

- 提供规则快照端点，返回 `{ version, disclaimer, acuteKeywords, tools, permissions }`，供前端渲染引导文案、急症提示、工具清单与权限说明。

### 3.10 前端视图

- 左侧会话列表（新建/切换）；右侧消息流：用户右对齐深蓝、角色回复左对齐白底；工具消息折叠卡片仅展示工具名与摘要；急症 `safety:acute` 红色 Alert 常驻提示；草稿面板展示诊断/处方草稿与「需执业医师复核」「非院外处方」徽章；免责声明常驻页面底部与每条 assistant 回复下方；顶部展示状态/角色标签；退出按钮调 `exitThread`（契约 §14.2）。

## 4. 医疗安全红线（契约 §15，逐条落码并自检）

1. 急症 `escalated` 旁路优先于角色编排；SSE 可下发 `safety:acute` 帧；免责声明常驻前端与回复载荷。
2. 诊断/处方草稿 `needsPhysicianReview: true`；处方 `isOutOfHospitalPrescription: false`（zod 字面量强制）；AI 不自主开医嘱、不直接产出在院事务。
3. 工具调用审计只留工具名/状态/耗时/证据数/错误分类，不回显原始入参明文。
4. 角色 `safeLlm` 降级时审计归属正确；四角色审计透传 `traceId`。
5. LLM 凭证仅取 `process.env`；无凭证确定性降级；不联网、不产生临床结论。
6. 急症词表可按测试需要扩充但不得删除；Doctor 禁止输出确诊结论；Pharmacist 禁止直接开具在院医嘱。
7. 免责声明常量（契约 §1.4）：
   - `DISCLAIMER`：`本回复由 AI 辅助生成，仅供健康科普与就诊参考，不能替代执业医师/药师的面对面诊断与处方决策；如有急症请立即拨打 120 或前往最近急诊。`
   - `ACUTE_GUIDANCE`：`检测到可能的急症信号：请立即停止自助问诊，前往最近医疗机构急诊或拨打 120；以下信息仅用于向急救人员描述情况，不构成诊断。`

## 5. 非功能需求

### 5.1 合规

- 产品正式名称固定「健澜AI原生医院操作系统OS」；新增交付树内禁止出现历史旧称及其大小写、连字符变体，品牌口径以本条正式名称为准。
- 病历/画像/草稿/审计字段不越权访问；未登录返回 401，权限不足返回 403；审计端点仅 `consult-agent:audit` 可访问。
- 迁移 DDL 头部注释含医疗安全红线、权限码、幂等说明与版权行；语句幂等可重入（契约 §13）。

### 5.2 审计

- 写操作三件套：`requirePermissionCode(c, code)` + `auditOperation(c)`（fire-and-forget）+ `withIdempotency`（`Idempotency-Key` 头，8–200 字符；无头不改变行为）。
- 审计条目记录 `actorRole`、`action`、`toolName`、`toolStatus`、`durationMs`、`evidenceCount`、`errorClass`、`traceId` 与脱敏后的结构化 `detail`；`detail` 禁止原始入参（契约 §1.2 `ConsultAuditEntry`）。
- 审计写库异常不阻断主请求；`DEMO_MODE=1` 跳过 DB 写库（基线勘查档案 §4.4）。

### 5.3 幂等

- 写请求携带 `Idempotency-Key`（推荐 UUID，8–200 字符）；无该头不改变既有行为；同键复用到不同请求体返回冲突错误；重复且已完成安全重放首次响应（基线勘查档案 §4.3、契约 §12）。
- 流式端点（`POST /threads/:threadId/stream`）不做幂等校验，避免缓冲重序列化收干流。

### 5.4 可追溯

- 每条消息携带 `traceId`；审计条目透传同一 `traceId`；草稿、消息、工具调用记录可经 `threadId` 串联；审计轨迹支持按 `threadId` 与 `traceId` 检索（契约 §13 索引）。
- 草稿哈希 `draftHash` 对稳定业务字段做规范化序列化后 SHA-256 十六进制，支撑 Sentinel 去重与内容变更追溯（契约 §8）。

### 5.5 确定性与可测试性

- 意图分类、急症检测、安全等级评估、工具返回、降级文案均为确定性规则；不依赖网络即可在单元测试中断言。
- 状态机非法转移必须显式抛错，不得静默跳转（契约 §2）。

## 6. DEMO_MODE 边界

- `DEMO_MODE=1`：仓储层短路到 `runtime/sessionRuntime` 进程内会话/消息/草稿/画像内存存储，不连库；跳过真实 DB 写库与审计落库；演示种子提供引导文案、示例工具返回与规则快照基线（契约 §0 `runtime/sessionRuntime.ts`、`demo/demoSeed.ts`）。
- LLM 凭证仅来自 `process.env`：`ANTHROPIC_API_KEY`、`OPENAI_API_KEY`、`DEEPSEEK_API_KEY` 任一非空视为可用；当前实现不发起网络请求，直接走角色确定性模板，`degraded: true`；无凭证同样走确定性引导文案，`degraded: true`；所有降级文案带免责声明（契约 §9）。
- DEMO 模式下工具返回为内置确定性样例，不代表真实知识库/药品库/相互作用规则；前端错误经 `onError` 上报，禁止本地编造回复（契约 §14.1）。

## 7. 需求追溯

| 需求项 | 契约章节 | 实现落点 |
|---|---|---|
| 四角色编排 | §5 | `src/core/agent/consult/roles/` |
| 意图分类 | §3 | `src/core/agent/consult/intentClassifier.ts` |
| 急症旁路 | §4、§10.2 | `safety/`、`consultOrchestrator.ts` |
| 工具注册表 | §6 | `tools/toolRegistry.ts` |
| 双层记忆 | §7 | `memory/` |
| Sentinel 审批 | §8 | `sentinel/sentinelGateway.ts`、`draftHash.ts` |
| LLM 降级 | §9 | `llm/safeLlm.ts` |
| BFF 端点 | §12 | `src/bff/routes/consultAgentRoutes.ts` |
| 仓储与迁移 | §12、§13 | `src/db/repositories/consultAgentRepo.ts`；迁移 `380-consult-threads.sql`、`381-consult-messages.sql`、`382-consult-documents.sql`、`383-consult-drafts.sql`、`384-consult-audit-trail.sql`、`385-consult-profile-memory.sql`（`deploy/postgres/init/`，schema `consult`） |
| 前端 | §14 | `web/src/services/api/consultAgent.ts`、`web/src/pages/consult-agent/ConsultAgentChatPage.tsx` |
