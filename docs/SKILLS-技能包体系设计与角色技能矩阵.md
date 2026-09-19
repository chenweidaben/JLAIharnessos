# jlmedaios 技能包（Skill）体系设计与角色技能矩阵

> 杭州健澜科技有限公司 · 数智医院智能体操作系统（jlmedaios）第二阶段升级
> 初心：让医疗 AI 更简单、更落地

---

## 1. 设计目标

在既有 **Tool（手）/ Agent（员工）** 两层之上，新增中间层 **Skill（SOP，标准作业程序）**：

| 层 | 位置 | 含义 | 类比 |
|---|---|---|---|
| Tool | `src/medical-tools/*`（约 37 个） | 原子医疗能力 | 手 |
| **Skill** | `src/skills/*` + `skills/library/*` | 声明式、可复用、可版本化的场景化能力包 | SOP |
| Agent | `src/orchestrator/*`（约 10 个） | 面向角色的自主执行单元 | 会用 SOP 的员工 |

一个 Skill = 一份 `SKILL.md`（YAML frontmatter + Markdown 工作流正文）。它声明：**什么场景、由什么角色、按什么步骤、调用哪些工具/知识、风险等级与所需权限**。

---

## 2. 工程结构（本次新增，未改动既有模块）

```
src/skills/
  types.ts                      # SkillManifest 类型 + Zod schema
  loader.ts                     # 扫描/解析 frontmatter/校验/依赖校验
  registry.ts                   # 注册中心：版本、按角色租户过滤、租户覆盖
  executor.ts                   # 工作流编排：顺序/条件/并行/人工确认、三级风险确认、审计
  integration/orchestratorAdapter.ts  # 触发匹配（意图/事件/定时）契约
  index.ts                      # 统一出口
skills/library/<role>/<skill-id>.md   # 33 个内置技能
src/bff/routes/skills.ts        # 技能管理 REST API（仅导出，未接线 server.ts）
web/src/pages/skills/            # 技能市场 + 技能工作室两个前端页
tests/unit/skills/skills.test.ts # 19 个单元测试
```

**严禁触碰并已遵守**：`resilience/*`、`cache/*`、`security/*`、`orchestrator/**`（只读参考）、`bff/server.ts`、`bff/middleware/*`、`medical-tools/*`、`core/agent/*` 均未修改。

---

## 3. SkillManifest 字段

| 字段 | 说明 |
|---|---|
| `id` | kebab-case 全局唯一 |
| `name` / `version(semver)` / `category` / `summary` / `description` / `icon` | 基本信息 |
| `triggers` | `phrases[]`（意图）/ `schedule`（cron）/ `event`（事件名） |
| `roles` | 可用角色，严格对齐 `security/types.ts` 的 `RoleCode`（R01–R12） |
| `requiredTools` / `requiredAgents` / `requiredKnowledge` / `requiredCdsRules` | 依赖声明（加载时校验真实存在） |
| `riskLevel` | `low / medium / high` |
| `permissions` | 权限点（对齐 RBAC PermissionKey） |
| `inputSchema` / `outputSchema` | JSON Schema 片段 |
| `enabled` / `tenantScope` / `author` / `tags` | 管理属性 |
| `steps[]` | 工作流：`tool / agent / knowledge / human_confirm / condition / parallel` |

---

## 4. 工作流执行与安全

- **RBAC 前置**：调用方角色不在 `manifest.roles` 直接 `denied`。
- **三级风险确认**：
  - `low`：直接执行；
  - `medium`：单级用户确认；
  - `high`：一级用户确认 + 二级双签复核，任一拒绝即中止，绝不带病执行写操作。
- **人工确认节点** `human_confirm` 可指定复核角色（如主任医师）。
- **条件/并行**：`condition` 仅支持 `{{var}} == 'v'` / `!=` / 真值，杜绝任意代码注入；`parallel` 并行子步骤。
- **审计埋点**：每个关键动作（授权、风险预检、工具/智能体调用、人工确认、整体成败）落 `SkillAuditEntry`，对接既有审计模块。
- **失败补偿**：返回 `sideEffects[]`（已执行的写操作），供回滚/补偿。

---

## 5. 多租户 / 一院多区

- `SkillRegistry.setTenantOverride(skillId, tenantId, { enabled, params })`：租户/院区级**只可覆盖 enabled 与参数**。
- **安全红线**：`tenantScope=false` 的系统技能拒绝被租户改写；技能本体（清单正文、步骤、工具依赖）租户只读。
- 列表查询按 `tenantId` 自动套用覆盖，实现多医院/多院区数据与开关隔离。

---

## 6. 角色 × 技能矩阵（33 个内置技能）

| 角色目录 | 技能 id | 名称 | 风险 | 关键依赖 |
|---|---|---|---|---|
| 门诊 | `ai-outpatient-record` | **AI 门诊病历生成**（标杆） | medium | generate_medical_record / medical-record-writer |
| 门诊 | `voice-medical-record` | **语音电子病历**（标杆，ASR 文本接口抽象+Mock） | medium | generate_medical_record / voice-medical-record |
| 门诊 | `outpatient-smart-consult` | 智能预问诊与分诊 | low | triage-preconsult |
| 门诊 | `outpatient-exam-suggestion` | 检查检验建议 | medium | diagnosis-assistant / order_lab_test |
| 住院 | `inpatient-daily-note` | AI 住院病程/查房记录生成 | medium | medical-record-writer |
| 住院 | `inpatient-order-entry` | 医嘱开立与核对 | high | create_order / order_audit |
| 住院 | `inpatient-clinical-pathway` | 临床路径管理 | low | treatment_plan_suggestion |
| 护理 | `nursing-record` | 护理记录辅助 | medium | generate_medical_record |
| 护理 | `nurse-order-verification` | 医嘱核对与执行 | high | get_order_list / order_audit |
| 护理 | `nurse-critical-value-report` | 危急值上报与闭环 | high | critical_value_alert |
| 药学 | `pharmacist-prescription-pre-review` | 处方前置审核 | high | prescription-review / prescription_audit |
| 药学 | `pharmacist-antibiotic-grading` | 抗菌药物分级管理 | high | prescription_audit |
| 药学 | `pharmacist-adr-monitoring` | ADR 不良反应监测 | low | get_drug_info |
| 医技 | `tech-lab-report-interpret` | 检验报告智能解读 | low | get_lab_result / lab-imaging-interpreter |
| 医技 | `tech-imaging-report-interpret` | 影像报告解读与调阅 | low | get_image_report / view_dicom |
| 医技 | `tech-lab-order-dispatch` | 检验申请调度 | low | get_lab_result |
| 质控 | `medical-record-quality-control` | **AI 病历内涵质控**（标杆） | low | medical_record_quality_check / medical-record-qc |
| 质控 | `quality-core-system-check` | 核心制度合规检查 | low | core_system_check |
| 质控 | `quality-frontpage-check` | 病案首页质控 | low | medical_record_front_page_check / medical-coder |
| 管理 | `director-drg-dip-analysis` | DRG/DIP 分组与盈亏 | low | drg_dip_analysis |
| 管理 | `director-department-operation` | 科室运营分析 | low | department_operation_analysis |
| 管理 | `director-management-report` | 医务统计与管理报表 | low | medical-affairs-report |
| 急诊 | `emergency-triage-green-channel` | 急诊分诊与绿色通道 | high | triage-preconsult / critical_value_alert |
| 急诊 | `emergency-critical-value-handling` | 急诊危急值处置 | high | critical_value_alert |
| 急诊 | `emergency-resuscitation-record` | 急诊抢救记录生成 | medium | medical-record-writer |
| 患者服务 | `patient-appointment-followup` | 预约挂号与诊后随访 | low | appointment_registration / follow-up |
| 患者服务 | `patient-visit-reminder` | 就诊提醒与健康宣教（定时） | low | visit_reminder |
| 患者服务 | `patient-followup-recovery` | 出院随访与康复管理 | low | follow_up_management |
| 系统管理 | `admin-skill-orchestrator` | 低代码技能编排器 | low | — |
| 系统管理 | `admin-agent-factory` | 智能体工厂 | low | — |
| 系统管理 | `admin-tenant-management` | 多租户/一院多区管理 | medium | — |
| 系统管理 | `admin-role-permission-config` | 角色与权限可配置 | high | — |
| 系统管理 | `admin-skill-market` | 技能市场管理 | medium | — |

> 三个用户点名刚需已做成**真实可跑标杆**：AI 病历生成、AI 病历质控、语音电子病历（ASR 以文本接口抽象，当前 Mock，生产可无缝替换真实医疗 ASR）。

---

## 7. BFF API 一览

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/skills` | 列表（支持 roles/category/tenantId/enabledOnly） |
| GET | `/api/v1/skills/catalog` | 角色/工具/智能体字典（前端下拉） |
| GET | `/api/v1/skills/:id` | 详情（含正文） |
| GET | `/api/v1/skills/:id/versions` | 版本数 |
| POST | `/api/v1/skills/validate` | 在线校验 SKILL.md |
| POST | `/api/v1/skills/dry-run/:id` | 试运行（Mock invoker） |
| POST | `/api/v1/skills` | 新建/热注册（admin） |
| PUT | `/api/v1/skills/:id/enabled` | 启停（admin） |
| POST | `/api/v1/skills/:id/tenant-override` | 租户覆盖（admin，系统技能拒绝） |

---

## 8. 验证结果

- 内置技能加载：**33 个，0 解析错误，0 依赖缺失**。
- 后端 `bunx tsc --noEmit`：**0 错误**。
- 后端 `bun test`：**1132 pass / 0 fail**（基线 1058 + 新增 19，只增不减）。
- 前端 `web/` `bunx tsc --noEmit`：**0 错误**。
