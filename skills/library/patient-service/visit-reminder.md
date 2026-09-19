---
id: patient-visit-reminder
name: 就诊提醒与健康宣教
version: 1.0.0
category: 患者服务
summary: 就诊前自动短信/App 提醒，按病种推送个性化健康宣教内容。
description: 患者服务中心定时任务，减少爽约率。
icon: BellOutlined
triggers:
  schedule: 0 8 * * *
  phrases: [就诊提醒]
roles: [R10, R11]
requiredTools:
  - visit_reminder
  - appointment_registration
requiredAgents: []
requiredKnowledge: [patient-education-library]
requiredCdsRules: []
riskLevel: low
permissions: [patient:read:assigned]
steps:
  - id: remind
    kind: tool
    name: 发送就诊提醒
    tool: visit_reminder
    input: { date: '{{date}}' }
---

# 就诊提醒与健康宣教
1. 定时拉取次日预约。
2. 发送提醒与宣教。
