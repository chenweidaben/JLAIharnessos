---
id: director-drg-dip-analysis
name: DRG/DIP 分组与盈亏分析
version: 1.0.0
category: 管理
summary: 自动预测 DRG/DIP 分组，识别歧义病例与高套风险，分析科室盈亏。
description: 科主任/医保办按科室分析病组结构、费用偏差与盈亏。
icon: BarChartOutlined
triggers:
  phrases: [DRG, DIP, 病组]
roles: [R02, R03]
requiredTools:
  - drg_dip_analysis
  - department_operation_analysis
requiredAgents: [medical-coder]
requiredKnowledge: [drg-grouping-rules]
requiredCdsRules: []
riskLevel: low
permissions: [operation:read:department]
steps:
  - id: group
    kind: tool
    name: DRG/DIP 分组分析
    tool: drg_dip_analysis
    input: { department: '{{department}}' }
  - id: op
    kind: tool
    name: 科室运营对照
    tool: department_operation_analysis
    input: { department: '{{department}}' }
---

# DRG/DIP 分组与盈亏分析
1. 病组分组与费用偏差。
2. 运营对照，输出改进建议。
