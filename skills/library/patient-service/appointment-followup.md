---
id: patient-appointment-followup
name: 预约挂号与诊后随访
version: 1.0.0
category: 患者服务
summary: 智能预约挂号、诊后自动生成随访问卷并回收，红旗症状转人工。
description: 患者服务中心批量预约与随访，异常结果自动转医护复核。
icon: CalendarOutlined
triggers:
  phrases: [预约挂号, 随访]
roles: [R11, R10, R08]
requiredTools:
  - appointment_registration
  - follow_up_management
requiredAgents: [follow-up]
requiredKnowledge: [followup-questionnaire-library]
requiredCdsRules: []
riskLevel: low
permissions: [patient:read:assigned]
steps:
  - id: book
    kind: tool
    name: 预约挂号
    tool: appointment_registration
    input: { patientId: '{{patientId}}' }
  - id: survey
    kind: agent
    name: 生成并下发随访问卷
    agent: follow-up
    input: { patientId: '{{patientId}}' }
---

# 预约挂号与诊后随访
1. 预约挂号。
2. 自动随访；红旗症状转人工。
