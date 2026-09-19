---
id: pharmacist-antibiotic-grading
name: 抗菌药物分级管理
version: 1.0.0
category: 药学
summary: 按非限制/限制/特殊使用级审核抗菌药物处方，越权开具自动拦截并提示会诊。
description: 落实抗菌药物分级管理制度，特殊使用级需高级职称/会诊。
icon: SafetyCertificateOutlined
triggers:
  phrases: [抗菌药, 抗生素]
roles: [R09, R04, R03]
requiredTools:
  - prescription_audit
  - get_drug_information
requiredAgents: []
requiredKnowledge: [antibiotic-grading-list]
requiredCdsRules: [antibiotic-grading]
riskLevel: high
permissions: [prescription:audit:department]
steps:
  - id: grade
    kind: tool
    name: 判定分级
    tool: get_drug_information
    input: { query: '{{drugName}}' }
  - id: audit
    kind: tool
    name: 分级合规审核
    tool: prescription_audit
    input: { prescriptionId: '{{prescriptionId}}' }
---

# 抗菌药物分级管理
1. 判定药品分级。
2. 审核医师权限是否匹配；越级自动拦截。
