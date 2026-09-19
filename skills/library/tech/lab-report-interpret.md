---
id: tech-lab-report-interpret
name: 检验报告智能解读
version: 1.0.0
category: 医技
summary: 自动标注检验异常项，给出临床意义与复查建议，医生/患者双版本。
description: 检验结果回传后自动解读，危急值强制提醒。
icon: FileSearchOutlined
triggers:
  event: lab.report.ready
  phrases: [解读化验单, 报告解读]
roles: [R10, R05, R06]
requiredTools:
  - get_lab_result
requiredAgents: [lab-imaging-interpreter]
requiredKnowledge: [lab-reference-range]
requiredCdsRules: [critical-value-rule]
riskLevel: low
permissions: [lab:read:assigned]
steps:
  - id: result
    kind: tool
    name: 读取检验结果
    tool: get_lab_result
    input: { patientId: '{{patientId}}' }
  - id: interpret
    kind: agent
    name: AI 解读
    agent: lab-imaging-interpreter
    input: { patientId: '{{patientId}}' }
---

# 检验报告智能解读
1. 读取结果。
2. 异常标注与临床意义解读；危急值强制提醒。
