---
id: pharmacist-prescription-pre-review
name: 处方前置审核
version: 1.0.0
category: 药学
summary: 六维前置审核（相互作用/配伍/剂量疗程/过敏/特殊人群），分级拦截不合理处方。
description: 药师在收费前前置审核门诊/住院处方，不合理处方退回医师并说明理由。
icon: AuditOutlined
triggers:
  phrases: [处方审核, 审方]
roles: [R09, R04]
requiredTools:
  - prescription_audit
  - drug_interaction_check
  - get_prescription_list
requiredAgents: [prescription-review]
requiredKnowledge: [drug-contrast-library]
requiredCdsRules: [drug-interaction, contraindication]
riskLevel: high
permissions: [prescription:audit:department]
steps:
  - id: review
    kind: agent
    name: 智能前置审方
    agent: prescription-review
    input: { prescriptionId: '{{prescriptionId}}' }
  - id: interaction
    kind: tool
    name: 相互作用复核
    tool: drug_interaction_check
    input: { prescriptionId: '{{prescriptionId}}' }
  - id: decide
    kind: human_confirm
    name: 药师复核结论
    confirmMessage: 请药师确认审核结论（通过/退回/双签）
    confirmRoles: [R09]
---

# 处方前置审核
1. 智能六维审核。
2. 相互作用复核。
3. 药师确认；高风险处方三级确认 + 审计。
