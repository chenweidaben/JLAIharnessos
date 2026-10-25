# consult-agent M86 测试策略

> Copyright (c) 2026 杭州健澜科技有限公司
>
> 所属产品：**健澜AI原生医院操作系统OS**。
> 分层、目录、用例范围与门禁顺序以冻结契约 `reports/consult-rebuild/CONTRACT-m86.md`
> §0、§15、§16 与基线勘查档案 §4.9、§7 为准。

## 1. 测试目标与原则

- 覆盖状态机、意图分类、急症旁路、四角色编排、双层记忆、工具注册表、Sentinel 去重、草稿哈希、免责声明、类型校验与演示种子。
- 安全用例覆盖读 / 写 / 审计三类权限码、未登录 401、越权 403。
- 集成 E2E 覆盖：创建会话 → 问诊 → 草稿 → 急症旁路 → 审计 / 幂等回放。
- 纯函数直接断言；路由测试使用最小 fake `Ctx`；不依赖真实数据库与网络。
- 不得用估算覆盖率充数；本机环境跑不通的项在交付报告如实标注缺口，禁止伪造通过（契约 §16）。

## 2. 测试分层与目录（契约 §0、§16）

| 层级 | 目录 | 对象 | 范式 |
|---|---|---|---|
| 单元测试 | `tests/unit/consult-agent/` | 核心包纯函数、角色、记忆、工具、哨兵、哈希、常量 | `import { describe, expect, it } from 'bun:test'`；相对路径 `../../src/...`；纯函数直接断言 |
| 安全测试 | `tests/security/consult-agent/` | BFF 路由权限码、未登录、越权 | 路由用最小 fake `Ctx`（参考 `tests/integration/inpatient-routes.test.ts` 的 `makeCtx`） |
| 集成测试 | `tests/integration/consult-agent/` | 编排器端到端流程、SSE 回放、幂等回放、审计落库（DEMO 内存） | fake 仓储 / fake LLM / 确定性工具返回；`DEMO_MODE=1` 跳过真实 DB |

测试运行命令（bun 绝对路径，契约 §16）：

```powershell
& "C:\Users\lenovo\.bun\bin\bun.exe" test tests/unit/consult-agent tests/security/consult-agent tests/integration/consult-agent
```

## 3. 单元测试用例清单

### 3.1 状态机（`stateMachine.ts`）

| 用例 | 断言要点 |
|---|---|
| 合法转移放行 | `idle → collecting`、`collecting → clarifying`、`drafting → review_pending`、`escalated → closed` 等表内转移 `canTransition === true`、`assertTransition` 不抛错 |
| 非法转移拒绝 | 表外转移（如 `closed → collecting`、`review_pending → escalated`、`escalated → collecting`）`canTransition === false`、`assertTransition` 抛 `Error` |
| 终态出边为空 | `closed`、`aborted` 对任意目标均不可转移 |
| 转移表完整性 | `THREAD_TRANSITIONS` 键集与 `ThreadStatus` 八值一一对应，无遗漏、无多余枚举 |

### 3.2 意图分类（`intentClassifier.ts`）

| 用例 | 断言要点 |
|---|---|
| 问候识别 | `你好` / `您好` / `在吗` / `hi` / `hello` → `greeting`，`confidence` 在 0–1，`matched` 非空 |
| 退出识别 | `结束` / `退出` / `再见` / `不用了` / `关闭会话` → `exit` |
| 文档上传识别 | `上传` / `报告` / `化验单` / `影像` / `病历` / `检查结果`（附件语境）→ `document_upload` |
| 用药问题识别 | `药` / `用药` / `剂量` / `副作用` / `过敏` / `能否同服` / `处方` → `medication_question` |
| 慢病管理识别 | `慢性病` / `随访` / `血压` / `血糖` / `长期管理` / `复查` → `chronic_management` |
| 症状主诉识别 | `症状` / `难受` / `疼` / `痛` / `咳嗽` / `发热` / `头晕` / `乏力` 等 → `symptom_report` |
| 追问回答识别 | history 最近一条为 assistant 追问且本次为补充回答 → `clarification_answer` |
| 急症归类 | safetyGate 命中急症时直接归 `acute_emergency` |
| 兜底未知 | 无规则命中 → `unknown` |
| 确定性 | 同一输入重复调用结果一致；不发起网络请求 |

### 3.3 急症词表与安全等级（`safety/acuteVocabulary.ts`、`safety/safetyGate.ts`）

| 用例 | 断言要点 |
|---|---|
| 词表命中 | 39 个词表词条逐一至少一条样例命中；`detectAcute` 返回 `isAcute=true`、`matched` 记录命中词 |
| 归一化匹配 | 英文/大小写/前后空白归一化后仍可匹配 |
| `caution` 分级 | 含高危但非急危重表述（长期慢性病急性加重表述）→ `caution` |
| `normal` 分级 | 普通咨询表述 → `normal`，`matched` 为空 |
| 词表不可删除 | 内置词条集合与契约 §4.1 一致（扩充允许、删除不允许） |

### 3.4 四角色（`roles/`）

| 用例 | 断言要点 |
|---|---|
| Supervisor 分诊 | 用药问题 → `nextRole=pharmacist`；症状主诉信息充分 → `nextRole=doctor`；信息不足 → `nextRole=examiner`；问候 → 简短引导并维持 `collecting` |
| Supervisor 不旁路 acute | `acute` 由编排层旁路，Supervisor 角色内不处理急症 |
| Examiner 追问 | 输出 2–4 个结构化 `followUpQuestions`；不产草稿（`draft=null`）；状态导向 `clarifying` |
| Doctor 草稿 | `kind=diagnosis`；`needsPhysicianReview=true`；措辞为「建议排查/待复核」，不含确诊结论；附 `evidence` 与免责声明 |
| Pharmacist 草稿 | `kind=prescription`；核对过敏、相互作用；`isOutOfHospitalPrescription=false`；`needsPhysicianReview=true`；不直接开具在院医嘱；附风险提示与免责声明 |
| 审计透传 | 四角色输出 `audit` 条目携带自身 `actorRole` 与 `traceId` |
| 降级归属 | `safeLlm` 降级时 `degradedLlm=true`，审计归属正确；降级文案带免责声明 |

### 3.5 编排器（`consultOrchestrator.ts`）

| 用例 | 断言要点 |
|---|---|
| 装载与终态拒绝 | 终态线程新消息由 BFF 返回 409/400；编排器不进入角色 |
| 急症旁路顺序 | `acute` 命中时先于意图分类与角色分发；不进角色、不产草稿；产出 `safety:acute` 事件与 `acute_bypass` 审计 |
| `exit` 关闭 | 意图 `exit` → 线程转入 `closed`，返回退出确认 |
| 事件组装 | 正常流程事件序列包含 `delta` / `disclaimer` / `meta` / `done`；工具触发 `tool` 起止帧；草稿触发 `draft` 帧 |
| 记忆合并 | 角色 `memoryUpdates` 合并入画像；`RoleOutput.memoryUpdates` 不落库到错误用户 |
| 审计完整性 | 消息、草稿、审计条目在 `OrchestratorResult` 中可串联同一 `traceId` |

### 3.6 双层记忆（`memory/`）

| 用例 | 断言要点 |
|---|---|
| 短期滑窗 | `recentMessages(history, n=20)` 返回最近 20 条；超长截断顺序正确 |
| checkpoint | `checkpoint(threadId, messages)` 供 DEMO 运行时存取 |
| 画像读写 | `upsertFact` 同键覆盖、`listFacts` 返回当前事实；`mergeFacts` 合并更新不丢失未变更事实 |
| 事实键示例 | `allergy` / `chronic_condition` / `drug_intolerance` / `preferred_language` 可正常存取 |
| DEMO 短路 | `DEMO_MODE=1` 走 `sessionRuntime` 进程内 Map，不连库 |

### 3.7 工具注册表（`tools/`）

| 用例 | 断言要点 |
|---|---|
| 规范名解析 | `searchKnowledgeBase` / `lookupDrug` / `checkAllergy` / `checkInteraction` / `retrievePatientHistory` 可注册、可解析、`list()` 回显描述与别名 |
| 下划线别名解析 | `search_knowledge_base` 等别名解析到同一描述符 |
| 参数归一化 | `normalizeArgs` 下划线键转驼峰；剔除未知键 |
| 工具结果结构 | `ToolResult` 含 `success` / `evidence` / `summary` / `errorClass`；空证据返回空数组 |
| 证据分类 | `evidenceExtractor` 按 `knowledge/drug/allergy/interaction/history/document` 分类 |
| 审计字段隔离 | 工具调用记录只留 `callId/name/status/durationMs/evidenceCount/errorClass/summary`，不含原始入参明文 |
| DEMO 确定性 | 五个内置工具返回确定性样例，不联网 |

### 3.8 Sentinel 审批与草稿哈希（`sentinel/`、`draftHash.ts`）

| 用例 | 断言要点 |
|---|---|
| 正常审批 | 证据齐备、`normal`/`caution`、不违背红线 → `approved`，返回 `draftHash` |
| 重复去重 | 同线程同哈希已审批 → `duplicate`，返回既有 `existingDraftId`；不重复审批、不重复落库 |
| 拒绝：缺证据 | 证据为空 → `rejected` |
| 拒绝：acute | 安全等级 `acute` → `rejected` |
| 拒绝：违背红线 | 触及红线条件 → `rejected`，`reason` 可追溯 |
| 哈希稳定性 | 规范化序列化（键排序、evidence 排序、去除空白差异）后，稳定业务字段相同则哈希一致 |
| 哈希剔除字段 | `id/status/reviewerId/reviewedAt/reviewNote/createdAt/updatedAt/draftHash` 不参与哈希；修改这些字段不改变 `draftHash` |
| 参与哈希字段 | `kind/title/summary/content/evidence/needsPhysicianReview/isOutOfHospitalPrescription` 任一变更即改变哈希 |

### 3.9 免责声明与常量

| 用例 | 断言要点 |
|---|---|
| 声明常量一致 | `DISCLAIMER`、`ACUTE_GUIDANCE` 与契约 §1.4 逐字一致 |
| 回复携带声明 | 每条 assistant 回复 `disclaimer` 字段非空；降级文案同样携带 |
| 急症引导文案 | `safety:acute` 帧 `guidance` 为 `ACUTE_GUIDANCE` |

### 3.10 类型校验（zod schema，`types.ts`）

| 用例 | 断言要点 |
|---|---|
| `threadCreateSchema` | `title` ≤120 可选；`patientId` 为 uuid 可空；`initialMessage` ≤2000 可选；非法值校验失败 |
| `messageSendSchema` | `content` trim 后非空、≤4000；空串 / 超长拒绝 |
| `transcribeSchema` | `transcript` / `audioText` 至少其一非空；各自 ≤4000；两者皆空拒绝 |
| `draftSchema` 字面量 | `needsPhysicianReview=true`、`isOutOfHospitalPrescription=false`、`status='pending_review'` 字面量强制；其他取值校验失败 |
| 入参非法 400 | BFF 层 schema 校验失败映射 BAD_REQUEST 400 |

### 3.11 演示种子（`demo/demoSeed.ts`）

| 用例 | 断言要点 |
|---|---|
| 引导文案 | DEMO 引导文案与规则快照基线一致 |
| 示例工具返回 | 五个内置工具的示例证据结构可被 `evidenceExtractor` 正常分类 |
| 规则快照基线 | `{ version, disclaimer, acuteKeywords, tools, permissions }` 字段齐备，词表与注册表一致 |

## 4. 安全测试用例清单（`tests/security/consult-agent/`）

### 4.1 权限码矩阵

| 端点 | 方法 | 权限码 | admin | doctor | nurse | 未登录 |
|---|---|---|---|---|---|---|
| `/threads` | POST | `consult-agent:write` | 放行 | 放行 | 403 | 401 |
| `/threads` | GET | `consult-agent:read` | 放行 | 放行 | 放行 | 401 |
| `/threads/:threadId/messages` | POST | `consult-agent:write` | 放行 | 放行 | 403 | 401 |
| `/threads/:threadId/messages` | GET | `consult-agent:read` | 放行 | 放行 | 放行 | 401 |
| `/threads/:threadId/transcribe` | POST | `consult-agent:write` | 放行 | 放行 | 403 | 401 |
| `/threads/:threadId/audit` | GET | `consult-agent:audit` | 放行 | 403 | 403 | 401 |
| `/rules/snapshot` | GET | `consult-agent:read` | 放行 | 放行 | 放行 | 401 |
| `/threads/:threadId/stream` | POST | `consult-agent:write` | 放行 | 放行 | 403 | 401 |
| `/threads/:threadId/stream/replay` | GET | `consult-agent:read` | 放行 | 放行 | 放行 | 401 |
| `/threads/:threadId/drafts/:kind` | GET | `consult-agent:read` | 放行 | 放行 | 放行 | 401 |
| `/profile` | GET | `consult-agent:read` | 放行 | 放行 | 放行 | 401 |
| `/threads/:threadId/exit` | POST | `consult-agent:write` | 放行 | 放行 | 403 | 401 |

### 4.2 专项用例

| 用例 | 断言要点 |
|---|---|
| 未登录 401 | 无 token 访问任意受保护端点 → `UNAUTHORIZED` 401，不落审计写库副作用 |
| 越权写 403 | nurse 调用写端点 → `FORBIDDEN` 403，不产生会话 / 消息 / 草稿 |
| 越权审计 403 | doctor / nurse 访问 `/threads/:threadId/audit` → 403 |
| admin 放行 | admin 角色绕过精确匹配守卫，三类权限均可通过 |
| 写操作三件套 | 写端点依次执行 `requirePermissionCode` + `auditOperation` + `withIdempotency`；权限拒绝时后续步骤不执行 |
| 审计脱敏 | 审计 `detail` 不含原始入参明文；工具审计不含原始入参字段 |
| 草稿红线 | zod 拒绝 `needsPhysicianReview !== true`、`isOutOfHospitalPrescription !== false`、`status !== 'pending_review'` 的载荷 |

## 5. 集成 E2E 用例清单（`tests/integration/consult-agent/`）

### 5.1 主流程：创建会话 → 问诊 → 草稿

1. `POST /threads`（`consult-agent:write`，携带 `Idempotency-Key`）创建会话，断言返回 `{ thread, messages, draft? }`，线程初始状态合法。
2. `POST /threads/:threadId/messages` 发送症状主诉，断言 `thread`、`message` 返回；事件流包含 `disclaimer`、`meta`、`done`。
3. 信息充分路径：Doctor 产出 `diagnosis` 草稿；断言 `needsPhysicianReview=true`、`status='pending_review'`、`evidence` 非空、`draftHash` 一致。
4. 用药路径：Pharmacist 产出 `prescription` 草稿；断言 `isOutOfHospitalPrescription=false`、`needsPhysicianReview=true`。
5. `GET /threads/:threadId/drafts/:kind` 返回对应草稿；同哈希重复审批返回既有草稿（`duplicate` 语义在哨兵层断言）。
6. `GET /profile` 返回画像事实；`GET /threads/:threadId/messages` 顺序与 `created_at ASC` 一致。

### 5.2 急症旁路流程

1. 会话处于 `collecting`，发送命中急症词表的消息。
2. 断言状态转入 `escalated`；返回消息为 `ACUTE_GUIDANCE`；事件含 `safety:acute`（`matched` 非空）。
3. 断言未产出草稿、未进入角色编排；审计含 `acute_bypass` 条目，`traceId` 透传。
4. 后续在 `escalated` 状态发送普通消息被拒绝；仅可 `closed` / `aborted`。

### 5.3 审计与幂等回放

1. 写操作携带 `Idempotency-Key`：首次执行落库；同键重试返回首次响应（幂等重放）。
2. 同键不同请求体 → 冲突错误（409 语义）。
3. `GET /threads/:threadId/audit` 返回 `{ entries: ConsultAuditEntry[] }`；条目含 `actorRole`、`action`、`traceId`、脱敏 `detail`。
4. `GET /threads/:threadId/stream/replay` 按时间顺序重放持久化事件；事件类型集合与 §11 一致。
5. `POST /threads/:threadId/stream` 不消费 `Idempotency-Key`；帧格式 `data: {json}\n\n`，结束帧 `data: [DONE]\n\n`。

### 5.4 退出与终态

1. `POST /threads/:threadId/exit` 关闭会话，返回 `{ thread }`，状态 `closed`，写入 `closedAt`。
2. 终态会话新消息被 BFF 拒绝（409/400）。
3. `GET /threads` 列表包含已关闭会话；历史消息与草稿仍可按读权限查询。

## 6. 环境边界（契约 §9、§10.6、§12、§16）

| 环境条件 | 行为 | 测试断言 |
|---|---|---|
| `DEMO_MODE=1` | 仓储短路 `sessionRuntime` 进程内 Map，不连真实 DB；审计 DB 写库跳过 | 集成用例在该模式运行；不断言真实表数据 |
| 无 LLM 凭证 | `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `DEEPSEEK_API_KEY` 均空 → 确定性引导文案，`degraded=true` | 角色输出 `degradedLlm=true`；文案带免责声明 |
| 凭证存在但未联网 | 当前实现不发起网络请求，直接走角色确定性模板，`degraded=true` | 不出现网络调用；不产生临床结论 |
| 流路由 | 不挂 `withIdempotency`；不缓冲重序列化 | 安全 / 集成用例不向流端点传 `Idempotency-Key` |

## 7. 门禁顺序（契约 §16，F 分片全量收口）

按以下顺序执行，前一门禁失败不进入下一门禁：

1. **根类型检查**：`node_modules\.bin\tsc.cmd --noEmit`，exit 0（含 `src` + `tests`，strict）。
2. **ESLint**：`node_modules\.bin\eslint.cmd <新增文件...> --max-warnings 0`（import 排序、`T[]` 而非 `Array<T>`、消除 await-thenable 等）。
3. **Prettier**：`node_modules\.bin\prettier.cmd --check <新增文件...>`；不通过先 `--write` 后复查。
4. **单元测试**：`& "C:\Users\lenovo\.bun\bin\bun.exe" test tests/unit/consult-agent`。
5. **安全测试**：`& "C:\Users\lenovo\.bun\bin\bun.exe" test tests/security/consult-agent`。
6. **集成测试**：`& "C:\Users\lenovo\.bun\bin\bun.exe" test tests/integration/consult-agent`。
7. **全量回归**：`& "C:\Users\lenovo\.bun\bin\bun.exe" test tests/unit/consult-agent tests/security/consult-agent tests/integration/consult-agent`。

文档分片自测（A 分片）：

```powershell
node_modules\.bin\prettier.cmd --check docs/consult-agent docs/api/consult-agent-openapi.yaml
```

## 8. 覆盖率与如实标注纪律

- 覆盖率不作为唯一通过标准；安全红线相关用例（急症旁路、草稿字面量、权限码、审计脱敏、工具入参隔离）必须全绿。
- 本机环境跑不通的用例（如真实 DB 连接、真实 LLM 调用）在交付报告中如实标注缺口与原因，禁止伪造通过结果。
- 测试文件命名与目录对齐 §0：`tests/unit/consult-agent/`、`tests/security/consult-agent/`、`tests/integration/consult-agent/`；不新增契约外的测试工具或框架依赖。
