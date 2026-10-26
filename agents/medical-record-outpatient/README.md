# 门诊病历智能体（medical-record-outpatient）

> 健澜AI原生医院操作系统OS · 门诊场景病历辅助生成
> 版权所有 (c) 2026 杭州健澜科技有限公司

## 包说明

面向门诊初诊、复诊、复诊续方、检验解读四类场景，基于患者实时资料、对话归一时间线与权威知识检索结果，分节生成结构化门诊病历；实时质控规则自检，经输出侧防护校验与执业医师人工确认后，回写 EMR 草稿。诊断方向、检查与用药建议强制挂载引用编号，全程不使用确定性诊断表述。

## 风险等级与人工确认

- **风险等级**：`medium`（文书生成类，需医师复核签名）。
- **允许角色**：`doctor`；非医生角色禁止调用草稿回写工具。
- **人工确认**：`humanInLoop: true`。人工节点支持采纳（adopted）、修改（modified）、拒绝（rejected）、多轮退回（returned-for-revision）；退回计入修订次数，最多 2 次，超限挂起转人工队列，不强行出稿。

## 工作流（outpatient-main）

```
开始
 → intent-classify（意图分流：initial / follow-up / renewal / lab-review）
 → fetch-patient（get_patient_profile）
 → fetch-records（get_visit_history ‖ get_recent_exams ‖ get_medication_list）
 → rag-guidelines（writing-standard / clinical-guide / data-standard / hospital-policy）
 → dialogue-normalize（去口语化、术语归一、时间线排序、缺失要素挂起）
 → outline（初诊 / 复诊两套大纲）
 → draft-sections（分节生成，诊断与建议挂引用编号）
 → qc-realtime（五条实时质控；问题回退 revise，最多 2 次）
 → output-guard（复用 S-01 输出侧防护）
 → human-review（医师人工确认）
 → write-record（submit_outpatient_draft；raise_qc_alert 按需触发）
 → 结束（事件 outpatient-record-completed 由运行时发出）
```

## 工具绑定

| 工具 | 用途 | 风险口径 |
| --- | --- | --- |
| `get_patient_profile` | 调取患者档案 | 只读 |
| `get_visit_history` | 调取既往就诊记录 | 只读 |
| `get_recent_exams` | 调取近期检验检查 | 只读 |
| `get_medication_list` | 调取在用药物清单 | 只读 |
| `kb_search` | 门诊规范与指南知识检索 | 只读 |
| `icd_lookup` | ICD-10 编码查询 | 只读 |
| `submit_outpatient_draft` | 经 EMR 授权接口回写门诊草稿并留痕 | 写操作，需医生角色 + 知情同意确认 |
| `raise_qc_alert` | 生成质控告警 | 写操作，按需触发 |

## 知识域绑定

- `writing-standard`：门诊病历书写规范；
- `clinical-guide`：专科诊疗指南、共识与临床路径；
- `data-standard`：ICD-10、药品字典、检验检查项目字典；
- `hospital-policy`：门诊核心制度与院内管理要求。

## 环境依赖边界（本轮未闭环项）

- **说话人分离 ASR**：供应商对接属于环境依赖，本包仅预留 `speaker` 分段结构与合成夹具；真实语音转写接入归后续批次。
- **真实工具接线**：运行时规则模块以适配器接口占位，真实工具注册表、RAG 检索链路与 EMR 授权接口归后续批次接线。
- **事件总线**：`outpatient-record-completed` 事件仅做声明预留，不接真实事件通道。
- **Catalog 挂载**：本包当前独立成包，未登记 `agents/manifest.json` 目录清单，目录加载器暂不挂接；清单挂载归后续 BFF / 前端批次。

## 免责声明

本门诊病历由 AI 辅助生成，仅供临床参考；诊断方向、检查与用药建议均须由执业医师结合实时资料核实确认，并经人工签名后方可作为正式医疗文书。AI 不承担诊疗责任。
