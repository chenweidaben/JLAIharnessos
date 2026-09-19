---
id: outpatient-smart-consult
name: 智能预问诊与分诊
version: 1.0.0
category: 门诊
summary: 就诊前结构化预问诊，推荐科室与分诊级别，急危重自动引导急诊绿色通道。
description: 患者到院后/线上预问诊阶段，结构化采集主诉、现病史，智能推荐科室与分级。
icon: CustomerServiceOutlined
triggers:
  phrases:
    - 预问诊
    - 分诊
    - 导诊
roles: [R06, R05, R10]
requiredTools:
  - query_patient
  - diagnosis_suggestion
requiredAgents:
  - triage-preconsult
requiredKnowledge: [triage-decision-tree]
requiredCdsRules: []
riskLevel: low
permissions: [patient:read:assigned]
steps:
  - id: intake
    kind: agent
    name: 结构化预问诊
    agent: triage-preconsult
    input: { text: '{{chiefComplaint}}' }
  - id: suggest
    kind: tool
    name: 科室与级别建议
    tool: diagnosis_suggestion
    input: { symptoms: '{{chiefComplaint}}' }
---

# 智能预问诊与分诊
1. 采集主诉/伴随症状。
2. 输出推荐科室、分诊级别；红旗症状自动提示急诊。
