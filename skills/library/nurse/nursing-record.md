---
id: nursing-record
name: 护理记录辅助
version: 1.0.0
category: 护理
summary: 基于体征与医嘱自动生成护理记录草稿，护士核对后签名。
description: 责任护士记录体温单、出入量、护理措施，AI 汇总当日护理事件。
icon: HeartBeatOutlined
triggers:
  phrases: [写护理记录, 护理记录]
roles: [R08]
requiredTools:
  - get_patient_detail
  - get_order_list
  - generate_medical_record
requiredAgents: []
requiredKnowledge: [nursing-record-standard]
requiredCdsRules: []
riskLevel: medium
permissions: [emr:create:assigned]
steps:
  - id: load
    kind: tool
    name: 调阅患者与执行医嘱
    tool: get_patient_detail
    input: { patientId: '{{patientId}}' }
  - id: draft
    kind: tool
    name: 生成护理记录草稿
    tool: generate_medical_record
    input: { patientId: '{{patientId}}', noteType: nursing }
  - id: sign
    kind: human_confirm
    name: 护士签名确认
    confirmMessage: 请责任护士核对护理记录并签名
---

# 护理记录辅助
1. 调阅患者与执行中医嘱。
2. 生成护理记录草稿。
3. 护士签名后归档。
