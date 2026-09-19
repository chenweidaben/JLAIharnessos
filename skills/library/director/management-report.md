---
id: director-management-report
name: 医务统计与管理报表
version: 1.0.0
category: 管理
summary: 并行汇聚质量、运营、DRG、核心制度数据，生成院级管理报表与改进建议。
description: 医务处/院领导定期查看全院运营与质量报表。
icon: FundOutlined
triggers:
  phrases: [管理报表, 医务统计]
roles: [R02, R01]
requiredTools:
  - medical_quality_indicators
  - drg_dip_analysis
requiredAgents: [medical-affairs-report]
requiredKnowledge: []
requiredCdsRules: []
riskLevel: low
permissions: [operation:read:hospital]
steps:
  - id: kpi
    kind: tool
    name: 汇总质量指标
    tool: medical_quality_indicators
    input: { scope: hospital }
  - id: report
    kind: agent
    name: 生成院级报表
    agent: medical-affairs-report
    input: { scope: hospital }
---

# 医务统计与管理报表
1. 汇聚质量/运营/DRG 数据。
2. 输出院级报表与改进建议。
