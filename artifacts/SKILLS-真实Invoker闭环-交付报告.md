# jlmedaios 技能体系 · 真实 Invoker 闭环升级交付报告

> 杭州健澜科技有限公司 · 数智医院智能体操作系统（jlmedaios）第二阶段续作
> 日期：2026-09-19 · 范围：把 Skill（SOP）体系从 Mock invoker 升级为真实闭环

## 一、本轮目标达成

把上一阶段搭建的 Skill 执行器从「Mock invoker」升级为「真实 invoker」：技能步骤不再是返回假数据，而是真正调用 **medical-tools 真实工具** 与 **DeepSeek 真实大模型**，三个标杆技能真实可跑，配 E2E 脚本与单元测试，全量回归只增不减。

## 二、Invoker 映射方式（核心机制）

新增 `src/skills/integration/realInvoker.ts`，导出 `buildRealSkillInvokers(options)`，实现既有 `SkillInvokers` 契约（executor 零改动接口）：

| 技能步骤 kind | 映射到真实实现 | 失败受控处理 |
|---|---|---|
| `tool` | 按 `toolName` 在 `createRegistryWithFirstBatch()` 注册表（37 工具）查到 `MedicalToolDefinition`，用工具自带 `inputSchema.safeParse(input)` 校验，再调 `execute(parsed, toolContext)` | 工具不存在→`TOOL_NOT_FOUND`；入参失败→`VALIDATION_ERROR`；执行异常→`MedicalAgentError.from` |
| `agent` | 视为「LLM 生成步骤」：按 `agentId` 选角色化 system 提示词，调 `createLlmClient()`（DeepSeek，只读 `process.env`），`chatOnce()` 消费 SSE 流式事件聚合文本+token 用量 | LLM 异常→`EXTERNAL_SYSTEM_ERROR` |
| `knowledge` | 受控摘要（待接知识库平台），不臆造 | — |

- **工具上下文**：`buildToolExecutionContext()` 构造最小合法 `MedicalToolContext`（含工具级权限超集 `TOOL_PERMISSION_SUPERSET`、安全空实现 auditor/desensitizer/confirm）。
- **可切换实现**：同时导出 `buildMockSkillInvokers(track?)`，单测用 Mock、真实脚本用 real，二者可互换。
- **高风险不绕过**：`riskLevel=high` 仍由 executor 强制一级确认+二级双签复核，real invoker 不触碰该链路（已测试验证：拒绝确认仍 aborted）。
- **安全红线**：API key 仅从 `process.env` 读，未硬编码、未提交 git。

## 三、三个标杆技能真实产出摘要（真实 DeepSeek，见 artifacts/skill-e2e.log）

1. **AI 门诊病历生成 `ai-outpatient-record`**（medium，succeeded）
   - 链路：`get_patient_detail` →（并行 `get_patient_history` + `get_medical_template`）→ `medical-record-writer`(DeepSeek) → 医生复核签名。
   - 真实产出：按主诉「反复咳嗽、咳痰伴发热3天」生成 SOAP 结构门诊病历草稿，缺失项以「[需补充]」标注，不臆造数值。token 用量 input≈175 / output≈175–338。
2. **语音电子病历 `voice-medical-record`**（medium，succeeded）
   - ASR 文本接口抽象（Mock 文本输入）→ `voice-medical-record` 智能体术语规范化 → `get_drug_information` 核对阿莫西林用法用量 → 电子签名归档。
   - 真实产出：把口语文本「男，四十五岁，咳嗽三天…阿莫西林零点五克每日三次吃七天」结构化为病历草稿，并自动标注剂量/频次/疗程待核对项与青霉素过敏史提醒。
3. **AI 病历内涵质控 `medical-record-quality-control`**（low，succeeded）
   - `medical-record-qc`(DeepSeek) → `medical_record_front_page_check`（病案首页质控，真实返回缺陷项）→ `medical_quality_indicators`（汇总本科室指标）。
   - 真实产出：按《住院病历内涵质控》要点输出含质控概况/合格项/缺陷项的结构化质控报告（本次 output≈1089 token）。

## 四、本轮改动与新增文件

**新增**
- `src/skills/integration/realInvoker.ts`：真实 invoker + 工具上下文 + `chatOnce` + Mock invoker。
- `tests/unit/skills/realInvoker.test.ts`：8 用例。
- `scripts/skill-e2e.ts`：真实 E2E（三技能全跑，结果落 `artifacts/skill-e2e.log`）。
- `artifacts/SKILLS-真实Invoker闭环-交付报告.md`（本文件）。

**修改（修复真实闭环暴露的问题）**
- `src/skills/executor.ts`：①修 parallel/condition 子步骤被主循环二次执行（`executed: Set` 守卫）；②修 parallel 分支对子步骤重复写记录。
- `skills/library/outpatient/voice-medical-record.md`：dose-check 步骤由错误的 `query` 改为 `drugName`（对齐 `get_drug_information` 真实入参），inputSchema 增 `drugName`。
- `skills/library/quality/medical-record-quality-control.md`：frontpage-check 改传 `frontPageData` 对象；summarize 改传 `startDate/endDate`；inputSchema 对齐真实工具。

**单元测试覆盖**：工具真实映射、TOOL_NOT_FOUND、入参校验失败（VALIDATION_ERROR）、空注册表注入、LLM 步骤产出文本+用量+角色化 system、低风险端到端真实工具+LLM、高风险拒绝确认仍中止、Mock 轨迹记录。

## 五、验证结果（真实跑命令）

| 验证项 | 命令 | 结果 |
|---|---|---|
| 后端类型 | `bunx tsc --noEmit` | **0 错误** |
| 技能单测 | `bun test tests/unit/skills` | **27 pass / 0 fail** |
| 全量回归 | `bun test` | **1175 pass / 0 fail / 105 文件 / 5755 expect**（基线 1167/104，+8 用例，只增不减） |
| 真实 E2E | `bun run scripts/skill-e2e.ts` | 3/3 技能 succeeded，真实 DeepSeek 产出，日志 `artifacts/skill-e2e.log` |

## 六、遗留问题与说明

1. **LLM agent 步骤的角色化提示词为内置映射**（`AGENT_SYSTEM_PROMPTS` 覆盖 10 个真实 agent id），后续可改为从 agent.yaml 动态读取系统提示词。
2. **知识检索** `searchKnowledge` 暂返回受控摘要，待接入知识库平台真实检索。
3. **语音 ASR** 仍为文本接口抽象（Mock），未接真实医疗 ASR 服务（按既定边界，不依赖真实 ASR 密钥）。
4. 质控 agent 在未传入具体病历正文时会要求「粘贴病历文本」，属正常行为；生产接入在架病历后即可自动核查。
5. 工具级权限用超集放行（技能级 RBAC 已由 executor 前置校验）；后续可在 realInvoker 上下文按科室/病区做更细数据权限收敛。
