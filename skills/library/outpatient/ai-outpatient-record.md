---
id: ai-outpatient-record
name: AI门诊病历生成
version: 1.0.0
category: 门诊
summary: 基于主诉、现病史、检验检查与临床指南，自动生成结构化门诊病历草稿，经医生确认后归档。
description: |
  门诊高峰时段辅助主治医师/住院医师快速书写病历。技能先调阅患者就诊与历史数据，
  再由 AI 病历生成智能体生成结构化草稿，强制医生人工确认后方可归档，
  全程脱敏并审计，绝不自动写入正式病历。
icon: FileTextOutlined
triggers:
  phrases:
    - 写门诊病历
    - 生成门诊病历
    - 帮我写病历
roles:
  - R05
  - R06
requiredTools:
  - get_patient_detail
  - get_patient_history
  - get_medical_template
  - generate_medical_record
requiredAgents:
  - medical-record-writer
requiredKnowledge:
  - outpatient-note-template
  - soap-documentation-guide
requiredCdsRules: []
riskLevel: medium
permissions:
  - emr:create:self
  - patient:read:assigned
inputSchema:
  type: object
  properties:
    patientId: { type: string }
    chiefComplaint: { type: string }
    presentIllness: { type: string }
  required: [patientId]
outputSchema:
  type: object
  properties:
    draftNote: { type: string }
    confirmed: { type: boolean }
enabled: true
tenantScope: true
author: 健澜科技
tags: [门诊, 病历, AI生成, 标杆]
steps:
  - id: fetch-patient
    kind: tool
    name: 调阅患者信息
    description: 读取患者基本信息与就诊历史
    tool: get_patient_detail
    input:
      patientId: '{{patientId}}'
    timeoutMs: 5000
  - id: fetch-history
    kind: parallel
    name: 并行调阅病史与模板
    parallel: [hist-step, tpl-step]
  - id: hist-step
    kind: tool
    name: 读取既往病史
    tool: get_patient_history
    input:
      patientId: '{{patientId}}'
  - id: tpl-step
    kind: tool
    name: 读取门诊病历模板
    tool: get_medical_template
    input:
      visitType: outpatient
  - id: draft-record
    kind: agent
    name: AI 生成病历草稿
    agent: medical-record-writer
    input:
      patientId: '{{patientId}}'
      chiefComplaint: '{{chiefComplaint}}'
      presentIllness: '{{presentIllness}}'
  - id: doctor-review
    kind: human_confirm
    name: 医生人工确认
    confirmMessage: AI 已生成门诊病历草稿，请核对主诉、诊断与处置后确认归档
    confirmRoles: [R05, R06, R03]
---

# AI 门诊病历生成 · 工作流说明

## 适用场景
门诊医师在接诊后、分诊/检查结果回传后，需要快速形成结构化门诊病历。

## 执行步骤
1. **调阅患者信息**：读取患者基本信息、在院状态。
2. **并行调阅**：同时拉取既往病史与门诊病历模板，缩短等待。
3. **AI 生成草稿**：委派 `medical-record-writer` 智能体生成 SOAP 结构化草稿。
4. **医生人工确认**：强制人工确认节点；未确认绝不归档。

## 安全与合规
- 全链路脱敏，仅接诊医师可见本人在管患者。
- 草稿为 `medium` 风险：单级用户确认；归档写操作审计留痕。
- AI 产出仅作草稿，最终诊断与处方由医师负责。
