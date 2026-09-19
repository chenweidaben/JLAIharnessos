---
id: emergency-critical-value-handling
name: 急诊危急值处置
version: 1.0.0
category: 急诊
summary: 急诊场景危急值秒级弹窗，联动抢救医嘱建议与团队通知。
description: 急诊医师在抢救场景下接收危急值，AI 给出处置建议。
icon: AlertOutlined
triggers:
  event: medical.critical_value
  phrases: [急诊危急值]
roles: [R05, R06, R08]
requiredTools:
  - critical_value_alert
  - get_lab_result
  - treatment_plan_suggestion
requiredAgents: [diagnosis-assistant]
requiredKnowledge: [emergency-resuscitation-sop]
requiredCdsRules: [critical-value-rule]
riskLevel: high
permissions: [lab:read:assigned, order:create:assigned]
steps:
  - id: alert
    kind: tool
    name: 接收危急值
    tool: critical_value_alert
    input: { alertId: '{{alertId}}' }
  - id: plan
    kind: tool
    name: 处置建议
    tool: treatment_plan_suggestion
    input: { patientId: '{{patientId}}' }
---

# 急诊危急值处置
1. 秒级弹窗。
2. AI 处置建议；抢救医嘱三级确认。
