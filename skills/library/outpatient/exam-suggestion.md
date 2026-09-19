---
id: outpatient-exam-suggestion
name: 检查检验建议
version: 1.0.0
category: 门诊
summary: 基于诊断方向推荐合理的检验检查项目，开立申请单并控制不合理检查。
description: 辅助医生选择必要检验/影像，避免过度检查；开立后经医生确认。
icon: ExperimentOutlined
triggers:
  phrases: [开检查, 开化验, 建议检查]
roles: [R05, R06, R04]
requiredTools:
  - diagnosis_suggestion
  - order_lab_test
  - order_imaging_exam
requiredAgents: [diagnosis-assistant]
requiredKnowledge: [lab-order-guideline]
requiredCdsRules: []
riskLevel: medium
permissions: [order:create:assigned]
steps:
  - id: diag
    kind: agent
    name: 诊断辅助
    agent: diagnosis-assistant
    input: { patientId: '{{patientId}}' }
  - id: pick-lab
    kind: tool
    name: 推荐检验项目
    tool: order_lab_test
    input: { patientId: '{{patientId}}' }
  - id: confirm
    kind: human_confirm
    name: 医生确认检查单
    confirmMessage: 请确认本次检验/影像申请单
---

# 检查检验建议
1. 诊断辅助给出方向。
2. 推荐并开立检验/影像申请。
3. 医生确认后生效。
