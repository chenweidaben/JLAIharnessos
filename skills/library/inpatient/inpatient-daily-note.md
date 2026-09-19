---
id: inpatient-daily-note
name: AI 住院病历/查房记录生成
version: 1.0.0
category: 住院
summary: 基于病程、检验回传与上级查房意见，自动生成住院病程与查房记录草稿。
description: 住院医师日常书写病程记录，AI 汇总当日病情变化与处置，上级医师审阅。
icon: ProfileOutlined
triggers:
  phrases: [写病程, 查房记录, 住院病历]
roles: [R06, R05, R04]
requiredTools:
  - get_patient_detail
  - get_lab_result
  - generate_medical_record
requiredAgents: [medical-record-writer]
requiredKnowledge: [progress-note-template]
requiredCdsRules: []
riskLevel: medium
permissions: [emr:create:assigned]
steps:
  - id: load
    kind: tool
    name: 调阅患者与当日检验
    tool: get_patient_detail
    input: { patientId: '{{patientId}}' }
  - id: draft
    kind: agent
    name: AI 生成病程草稿
    agent: medical-record-writer
    input: { patientId: '{{patientId}}', noteType: progress }
  - id: attend-review
    kind: human_confirm
    name: 上级医师审阅
    confirmMessage: 请主治医师/主任医师审阅病程记录草稿
    confirmRoles: [R05, R04, R03]
---

# AI 住院病历/查房记录
1. 调阅患者当日病情与检验。
2. AI 生成病程草稿。
3. 上级审阅后归档。
