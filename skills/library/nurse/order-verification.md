---
id: nurse-order-verification
name: 医嘱核对与执行
version: 1.0.0
category: 护理
summary: 护士执行前双人核对医嘱，自动比对医嘱单与患者腕带，异常拦截。
description: 护士站核对待执行医嘱，高风险药品/剂量双人核对。
icon: SafetyCertificateOutlined
triggers:
  phrases: [核对医嘱, 执行医嘱]
roles: [R08]
requiredTools:
  - get_order_list
  - order_audit
requiredAgents: []
requiredKnowledge: [medication-five-rights]
requiredCdsRules: [high-alert-medication]
riskLevel: high
permissions: [order:read:assigned, order:update:assigned]
steps:
  - id: list
    kind: tool
    name: 读取待执行医嘱
    tool: get_order_list
    input: { patientId: '{{patientId}}', status: pending }
  - id: check
    kind: tool
    name: 执行前核对
    tool: order_audit
    input: { patientId: '{{patientId}}' }
---

# 医嘱核对与执行
1. 拉取待执行医嘱。
2. 执行前核对（五准确认）；高风险药品触发三级确认。
