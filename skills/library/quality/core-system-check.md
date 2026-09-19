---
id: quality-core-system-check
name: 核心制度合规检查
version: 1.0.0
category: 质控
summary: 自动核查三级查房、交接班、疑难病例讨论等核心制度落实情况。
description: 质控科按制度清单自动检查在架病历，输出合规率。
icon: SafetyCertificateOutlined
triggers:
  phrases: [核心制度, 制度检查]
roles: [R02, R10]
requiredTools:
  - core_system_check
  - medical_quality_indicators
requiredAgents: []
requiredKnowledge: [core-system-checklist]
requiredCdsRules: []
riskLevel: low
permissions: [qc:read:hospital]
steps:
  - id: check
    kind: tool
    name: 核心制度检查
    tool: core_system_check
    input: { department: '{{department}}' }
  - id: kpi
    kind: tool
    name: 汇总质控指标
    tool: medical_quality_indicators
    input: { department: '{{department}}' }
---

# 核心制度合规检查
1. 核查核心制度落实。
2. 汇总合规率并输出整改项。
