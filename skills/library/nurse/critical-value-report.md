---
id: nurse-critical-value-report
name: 危急值上报与闭环
version: 1.0.0
category: 护理
summary: 检验/检查危急值自动弹窗，护士立即通知医师并记录闭环处置。
description: 危急值事件驱动，护士确认接收、通知医师、记录处置与复评时间。
icon: AlertOutlined
triggers:
  event: medical.critical_value
  phrases: [危急值]
roles: [R08, R05, R06]
requiredTools:
  - critical_value_alert
  - get_lab_result
requiredAgents: []
requiredKnowledge: [critical-value-handling-sop]
requiredCdsRules: [critical-value-rule]
riskLevel: high
permissions: [lab:read:assigned, emr:update:assigned]
steps:
  - id: alert
    kind: tool
    name: 接收危急值告警
    tool: critical_value_alert
    input: { alertId: '{{alertId}}' }
  - id: result
    kind: tool
    name: 调取危急值结果
    tool: get_lab_result
    input: { patientId: '{{patientId}}' }
  - id: notify
    kind: human_confirm
    name: 确认通知医师并记录
    confirmMessage: 请确认已通知主管医师并完成危急值闭环记录
---

# 危急值上报与闭环
1. 接收告警。
2. 调取结果。
3. 护士确认通知医师并闭环；高风险全程审计。
