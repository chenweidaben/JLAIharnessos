---
id: emergency-triage-green-channel
name: 急诊智能分诊与绿色通道
version: 1.0.0
category: 急诊
summary: 急诊预检分诊分级，急危重自动触发绿色通道并通知抢救团队。
description: 急诊护士站快速分级（I~IV级），I/II 级自动开绿色通道。
icon: ThunderboltOutlined
triggers:
  phrases: [急诊分诊, 绿色通道]
roles: [R08, R06, R05]
requiredTools:
  - query_patient
  - critical_value_alert
requiredAgents: [triage-preconsult]
requiredKnowledge: [emergency-triage-scale]
requiredCdsRules: [critical-value-rule]
riskLevel: high
permissions: [patient:read:assigned, emr:create:assigned]
steps:
  - id: triage
    kind: agent
    name: 急诊分级
    agent: triage-preconsult
    input: { patientId: '{{patientId}}', scene: emergency }
  - id: green
    kind: tool
    name: 触发绿色通道
    tool: critical_value_alert
    input: { patientId: '{{patientId}}', level: '{{triageLevel}}' }
---

# 急诊智能分诊与绿色通道
1. 快速分级。
2. I/II 级自动开绿色通道并通知抢救团队；高风险全程审计。
