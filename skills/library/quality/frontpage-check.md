---
id: quality-frontpage-check
name: 病案首页质控
version: 1.0.0
category: 质控
summary: 自动核病案首页主要诊断、手术编码、费用与医保一致性，提升首页质量。
description: 病案室对归档首页逐条核查，识别主要诊断选择错误与高套风险。
icon: FileDoneOutlined
triggers:
  phrases: [首页质控, 病案首页]
roles: [R10, R02]
requiredTools:
  - medical_record_front_page_check
  - medical_record_quality_check
requiredAgents: [medical-coder]
requiredKnowledge: [icd-coding-manual]
requiredCdsRules: []
riskLevel: low
permissions: [qc:read:hospital]
steps:
  - id: fp
    kind: tool
    name: 首页质控
    tool: medical_record_front_page_check
    input: { department: '{{department}}' }
  - id: code
    kind: agent
    name: 编码辅助
    agent: medical-coder
    input: { department: '{{department}}' }
---

# 病案首页质控
1. 首页核查。
2. 编码辅助识别错误与高套。
