---
id: inpatient-order-entry
name: 医嘱开立与核对
version: 1.0.0
category: 住院
summary: 辅助开立长期/临时医嘱，自动校验重复与冲突，药师/护士核对后执行。
description: 住院医师开立医嘱，技能自动拉取既有医嘱做冲突与重复检查。
icon: ProfileOutlined
triggers:
  phrases: [开医嘱, 下医嘱]
roles: [R06, R05, R04]
requiredTools:
  - get_order_list
  - create_order
  - order_audit
requiredAgents: []
requiredKnowledge: [order-caution-list]
requiredCdsRules: [drug-interaction, duplicate-therapy]
riskLevel: high
permissions: [order:create:assigned]
steps:
  - id: existing
    kind: tool
    name: 读取在院医嘱
    tool: get_order_list
    input: { patientId: '{{patientId}}' }
  - id: audit
    kind: tool
    name: 医嘱前置审核
    tool: order_audit
    input: { patientId: '{{patientId}}' }
  - id: create
    kind: tool
    name: 开立医嘱
    tool: create_order
    input: { patientId: '{{patientId}}', items: '{{items}}' }
---

# 医嘱开立与核对
1. 读取在院医嘱。
2. 前置审核（相互作用/重复）。
3. 开立医嘱；高风险操作强制三级确认。
