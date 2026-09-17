# AI 电子病历生成智能体（medical-record-writer）

> 健澜科技杠OS · 十大刚需智能体之一
> 让医生从"打字员"回归"诊疗者"。

## 解决的痛点

门诊/住院医生大量时间消耗在病历录入上。本智能体基于患者主诉、既往史、检验检查结果与权威临床知识，**一键生成结构化病历草稿**，自动质控并经医生审核签名后归档。

## 适用角色

- 门诊医生、住院医师（主要使用者）
- 质控员、科研人员（只读参考）

## 工作流（见 `agent.yaml`）

```
开始
 → 调取既往病史(get_patient_history)
 → 调取近期检验(get_lab_result)
 → 调取影像报告(get_image_report，失败不阻断)
 → 检索临床指南与病历规范(RAG)
 → 大模型生成结构化病历(LLM, JSON)
 → 病历质控(medical_record_quality_check)
 → 条件网关：质控是否通过？
     ├─ 通过 → 执业医师人工审核签名(human) → 归档至HIS/EMR(sync_to_his) → completed
     └─ 不通过 → 退回补充(needs_revision，附问题清单与缺失项)
结束
```

## 输入

| 字段 | 说明 |
|------|------|
| `patientId` | 患者标识（平台内脱敏ID） |
| `visitId` | 就诊号 |
| `chiefComplaint` | 主诉 |
| `presentIllnessNotes` | 医生口述/简要现病史笔记 |

## 输出

| 字段 | 说明 |
|------|------|
| `status` | `completed` / `needs_revision` |
| `recordId` | 归档后的病历ID |
| `qualityScore` | 质控评分 |
| `issues` / `gaps` | 质控问题 / 需补充项 |
| `draft` | 生成的结构化病历草稿 |

## 安全与合规

- AI 仅生成**草稿**，必须经执业医师审核电子签名后方可归档；
- 资料不足处留空并标记，严禁臆造；
- 危急线索显著提示急诊评估；
- 全流程审计留痕，患者标识脱敏。

> 示例见 `examples/input.json`（虚拟患者，非真实个人）。
