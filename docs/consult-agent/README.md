# consult-agent 模块文档索引

> Copyright (c) 2026 杭州健澜科技有限公司
>
> 所属产品：**健澜AI原生医院操作系统OS**。
> 本目录是 consult-agent（AI 辅助问诊助手）M86 重建的文档集；所有枚举、字段、路径、
> 权限码以冻结契约 `reports/consult-rebuild/CONTRACT-m86.md` 为单一事实来源。

## 1. 模块简介

consult-agent 在会话内完成意图分诊、信息采集、诊断建议草稿、用药审方草稿、急症识别与旁路引导，全程留痕、待执业医师复核。AI 仅产出辅助草稿，不自主确诊、不开具在院医嘱、不签发院外处方；急症信号一律旁路到急诊引导流程。

系统内编排角色为 **Supervisor**（编排分诊）、**Examiner**（信息不足追问）、**Doctor**（诊断建议草稿）、**Pharmacist**（用药审方草稿）；登录用户角色为 admin / doctor / nurse，权限矩阵见 §6。

## 2. 文档索引

| 文档 | 内容 |
|---|---|
| [01-requirements.md](./01-requirements.md) | 需求背景、四角色、功能需求、医疗安全红线、非功能需求、DEMO_MODE 边界 |
| [02-architecture.md](./02-architecture.md) | 分层架构、模块依赖图、端到端数据流、与既有 BFF 范式对齐说明 |
| [03-contract.md](./03-contract.md) | API 契约、类型契约、SSE 事件契约、前端视图契约（逐字抄录契约 §1、§11、§12、§14） |
| [04-data-model.md](./04-data-model.md) | 六表字段、类型、约束、索引、关系与 ER 说明（对齐契约 §13） |
| [05-state-machine.md](./05-state-machine.md) | 状态枚举、完整转移表、急症旁路规则、终态规则、五条典型时序 |
| [06-test-strategy.md](./06-test-strategy.md) | 测试分层、用例清单、权限矩阵、E2E 流程、门禁顺序与环境边界 |
| [07-milestone-m86.md](./07-milestone-m86.md) | M86 里程碑范围、A–G 分片计划、验收门禁清单、遗留旧称说明 |
| [../api/consult-agent-openapi.yaml](../api/consult-agent-openapi.yaml) | OpenAPI 3.0 规范：12 端点、类型 schema、SSE 事件扩展、错误信封 |

## 3. 代码落点导航

| 域 | 路径 |
|---|---|
| 核心包 | `src/core/agent/consult/` |
| BFF 路由 | `src/bff/routes/consultAgentRoutes.ts` |
| 权限登记 | `src/bff/permissions.ts`（末尾追加 `CONSULT_AGENT_PERMISSIONS`） |
| 仓储 | `src/db/repositories/consultAgentRepo.ts` |
| 迁移 | `deploy/postgres/init/380-consult-threads.sql`（`consult.threads`）、`381-consult-messages.sql`（`consult.messages`）、`382-consult-documents.sql`（`consult.documents`）、`383-consult-drafts.sql`（`consult.diagnosis_prescription_drafts`）、`384-consult-audit-trail.sql`（`consult.audit_trail`）、`385-consult-profile-memory.sql`（`consult.profile_memory`） |
| 前端服务层 | `web/src/services/api/consultAgent.ts` |
| 前端页面 | `web/src/pages/consult-agent/ConsultAgentChatPage.tsx` |
| 单元测试 | `tests/unit/consult-agent/` |
| 安全测试 | `tests/security/consult-agent/` |
| 集成测试 | `tests/integration/consult-agent/` |

## 4. 快速说明

- **DEMO_MODE=1**：仓储短路到 `runtime/sessionRuntime` 进程内存，不连库；演示种子提供引导文案、示例工具返回与规则快照基线。
- **LLM 凭证**：仅读取 `process.env` 的 `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `DEEPSEEK_API_KEY`；当前实现不联网，无凭证或有凭证均走确定性模板，`degraded=true`，文案带免责声明。
- **静态门禁**（仓库根执行，契约 §16）：

```powershell
node_modules\.bin\tsc.cmd --noEmit
node_modules\.bin\eslint.cmd <新增文件...> --max-warnings 0
node_modules\.bin\prettier.cmd --check docs/consult-agent docs/api/consult-agent-openapi.yaml
& "C:\Users\lenovo\.bun\bin\bun.exe" test tests/unit/consult-agent tests/security/consult-agent tests/integration/consult-agent
```

- **SSE 帧格式**：`data: {json}\n\n`，结束帧 `data: [DONE]\n\n`；流路由不消费 `Idempotency-Key`。

## 5. 安全提示（开发与评审必读）

1. 急症旁路优先于角色编排：`acute` 命中即转 `escalated`，不进角色、不产草稿，下发 `safety:acute` 帧。
2. 草稿恒为 `pending_review`：`needsPhysicianReview=true`；处方 `isOutOfHospitalPrescription=false`；zod 字面量强制；AI 不自主开医嘱。
3. 写操作三件套：权限码校验 + `auditOperation` 审计留痕 + `Idempotency-Key` 幂等校验。
4. 工具审计只留工具名/状态/耗时/证据数/错误分类/摘要，**不回显原始入参明文**。
5. 免责声明常驻前端页面底部与每条 assistant 回复下方；急症引导使用 `ACUTE_GUIDANCE` 常量。
6. 产品正式名称固定「健澜AI原生医院操作系统OS」；新增交付树内禁止出现旧称变体。

## 6. 权限码一览（契约 §12）

| 权限码 | 用途 | admin | doctor | nurse |
|---|---|---|---|---|
| `consult-agent:read` | 查看会话列表、历史消息、草稿、画像、规则快照、事件回放 | ✓ | ✓ | ✓ |
| `consult-agent:write` | 创建会话、发送消息、语音转写、流式问诊、退出会话 | ✓ | ✓ | – |
| `consult-agent:audit` | 查看会话审计轨迹 | ✓ | – | – |

端点与权限码对照详见 [03-contract.md](./03-contract.md) §3 与 OpenAPI 规范。

## 7. 参考文档

- 冻结契约：`reports/consult-rebuild/CONTRACT-m86.md`
- 基线勘查档案：`reports/consult-rebuild/baseline-survey.md`
- 既有 BFF 范式：`src/bff/routes/academicExchangeV13.ts`、`src/bff/routes/medmuseStream.ts`、`src/db/repositories/consultRequestRepo.ts`、`deploy/postgres/init/99-nursing-risk-warning.sql`
