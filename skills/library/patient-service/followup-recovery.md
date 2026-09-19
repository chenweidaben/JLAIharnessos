---
id: patient-followup-recovery
name: 出院随访与康复管理
version: 1.0.0
category: 患者服务
summary: 出院患者按病种随访，回收康复指标，异常自动复诊建议。
description: 慢病/术后患者长期随访，闭环康复管理。
icon: HeartOutlined
triggers:
  phrases: [出院随访, 康复随访]
roles: [R10, R08, R05]
requiredTools:
  - follow_up_management
  - visit_reminder
requiredAgents: [follow-up]
requiredKnowledge: [chronic-followup-plan]
requiredCdsRules: []
riskLevel: low
permissions: [patient:read:assigned]
steps:
  - id: plan
    kind: agent
    name: 制定随访计划
    agent: follow-up
    input: { patientId: '{{patientId}}' }
  - id: record
    kind: tool
    name: 记录随访结果
    tool: follow_up_management
    input: { patientId: '{{patientId}}' }
---

# 出院随访与康复管理
1. 制定随访计划。
2. 回收指标，异常建议复诊。
