---
id: pharmacist-adr-monitoring
name: ADR 不良反应监测
version: 1.0.0
category: 药学
summary: 自动识别疑似药品不良反应，辅助药师填报 ADR 报告并随访。
description: 用药后异常症状自动关联药品，辅助药师判断并上报 ADR。
icon: BugOutlined
triggers:
  phrases: [不良反应, ADR]
roles: [R09, R05]
requiredTools:
  - get_drug_info
  - search_medical_knowledge
requiredAgents: []
requiredKnowledge: [adr-report-guide]
requiredCdsRules: []
riskLevel: low
permissions: [prescription:read:department]
steps:
  - id: related
    kind: tool
    name: 关联在用药品
    tool: get_drug_info
    input: { patientId: '{{patientId}}' }
  - id: knowledge
    kind: knowledge
    name: 调阅 ADR 填报规范
    knowledgeRefs: [adr-report-guide]
---

# ADR 不良反应监测
1. 关联在用药品。
2. 调阅规范辅助填报与随访。
