---
id: director-department-operation
name: 科室运营分析
version: 1.0.0
category: 管理
summary: 汇聚门诊量、床位周转、药占比、耗占比等指标，生成科室运营看板。
description: 科主任月度运营复盘，识别效率与成本异常。
icon: DashboardOutlined
triggers:
  phrases: [科室运营, 运营分析]
roles: [R02]
requiredTools:
  - department_operation_analysis
  - medical_quality_indicators
requiredAgents: [medical-affairs-report]
requiredKnowledge: []
requiredCdsRules: []
riskLevel: low
permissions: [operation:read:department]
steps:
  - id: op
    kind: tool
    name: 运营指标分析
    tool: department_operation_analysis
    input: { department: '{{department}}' }
  - id: report
    kind: agent
    name: 生成管理报表
    agent: medical-affairs-report
    input: { department: '{{department}}' }
---

# 科室运营分析
1. 拉取运营指标。
2. 生成院科两级报表。
