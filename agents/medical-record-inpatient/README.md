# medical-record-inpatient 住院病历智能体包

## 包说明

- **智能体 ID**：`medical-record-inpatient`
- **中文名称**：住院病历智能体
- **风险等级**：`medium`；上级查房记录中涉及诊疗方案调整建议的部分按 `high` 风险处理，须上级医师确认。
- **人工确认**：`humanInLoop: true`。日常病程、入院记录、首次病程、阶段小结、出院记录与病情综合分析由主管医师确认；上级查房方案调整建议由上级医师确认。
- **入口工作流**：`inpatient-main`

本包对应技术文档 **4.3 住院病历智能体（S-10）** 与差距矩阵 **C-02 / S-10**，覆盖七类住院文书：

1. 入院记录 `admission-record`
2. 首次病程记录 `first-progress`
3. 日常病程记录 `daily-progress`
4. 上级医师查房记录 `senior-round`
5. 阶段小结 `stage-summary`
6. 出院记录 `discharge-record`
7. 病情综合分析 `comprehensive-analysis`

## 工作流主干

`fetch-inpatient-context` → `rag-standards-and-guidelines` → `choose-document-type` → `summary-or-outline` → `draft-sections` → `consistency-check` → `output-guard` → `human-review` → `write-record`；回写成功后由运行时预留事件 `inpatient-record-completed`。

一致性阻断项与 Schema 问题最多修订 2 次；超限后挂起为缺项骨架，不强行生成完整病历。

## 工具绑定

| 工具 ID | 用途 | 读写 |
| --- | --- | --- |
| `get_inpatient_context` | 调取患者与住院期间资料时间线 | 只读 |
| `get_order_list` | 调取医嘱清单 | 只读 |
| `get_exam_results` | 调取检验检查结果 | 只读 |
| `get_nursing_notes` | 调取护理记录 | 只读 |
| `voice_to_vitals` | 移动查房语音体征解析 | 只读 |
| `kb_search` | 检索病历规范、专科指南与制度知识 | 只读 |
| `icd_lookup` | ICD 编码查询占位 | 只读 |
| `submit_inpatient_draft` | 经 EMR 授权接口回写草稿并留痕 | 写 |
| `schedule_timeline_check` | 文书时限规则校验与提醒 | 只读 |

写路径三重校验：调用者角色为 `doctor`、`consentConfirmed === true`、`patientId` 与 `visitId` 齐全；任一不满足即阻断并记录 `UNAUTHORIZED_WRITE` 审计条目。

## 知识绑定

- `writing-standard`：住院各类文书规范与时限
- `clinical-guide`：专科诊疗常规 / 临床路径
- `data-standard`：检验参考范围、ICD-10 / ICD-9-CM-3、药品字典
- `hospital-policy`：三级查房、会诊、手术分级制度

## 复用边界

- 检验 / 检查解读复用 `src/bff/agents/shared/clinicalReportInterpretation.ts` 门诊 / 住院共用组件，住院侧不重复实现解读逻辑。
- 输出侧防护复用 S-01 `guardOutbound`；风险角色口径复用 S-06 `EXPERT_REVIEW_ROLE` / `PHYSICIAN_CONFIRM_ROLE`；引用协议复用 S-12；患者隔离口径对齐 S-13。
- 住院 Schema 与 S-09 门诊草稿 Schema 各自独立，互不替代。

## 环境依赖边界

本声明包与离线运行时仅用于规则、Schema、一致性、时限、体征解析与工作流编排闭环；以下内容归后续批次，不在本切片内声称已接通：

- ASR 说话人分离与语音转写供应商对接；
- 真实 RAG、药典、ICD-9-CM-3、检验参考范围、危急值字典、护理与医嘱字典；
- 真实工具注册表、EMR 回写接口、审计台账与草稿快照持久化；
- BFF 路由、前端查房 / 出院 / 引用弹窗页面；
- 事件总线真实挂载；
- `agents/manifest.json` 目录登记与 catalog 挂载。

## 文件清单

- `agent.yaml`：智能体声明、工具 / 知识绑定、工作流 DAG 与人工确认口径
- `prompts/system.md`：住院病历生成系统提示词
- `examples/input.json`：合成演示输入，不含真实院方实名、密码、token 或密钥
- `README.md`：本说明
