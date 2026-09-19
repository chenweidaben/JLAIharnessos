---
id: emergency-resuscitation-record
name: 急诊抢救记录生成
version: 1.0.0
category: 急诊
summary: 抢救过程时间线自动汇总，生成抢救记录草稿，事后补录并签名。
description: 抢救结束后自动汇总医嘱、用药、生命体征时间线。
icon: HistoryOutlined
triggers:
  phrases: [抢救记录]
roles: [R06, R05]
requiredTools:
  - get_patient_detail
  - generate_medical_record
requiredAgents: [medical-record-writer]
requiredKnowledge: [resuscitation-record-template]
requiredCdsRules: []
riskLevel: medium
permissions: [emr:create:assigned]
steps:
  - id: load
    kind: tool
    name: 调阅抢救时间线
    tool: get_patient_detail
    input: { patientId: '{{patientId}}' }
  - id: draft
    kind: agent
    name: 生成抢救记录
    agent: medical-record-writer
    input: { patientId: '{{patientId}}', noteType: resuscitation }
  - id: sign
    kind: human_confirm
    name: 医师补录签名
    confirmMessage: 请主诊医师核对抢救记录并签名
---

# 急诊抢救记录生成
1. 汇总时间线。
2. 生成草稿。
3. 医师补录签名。
