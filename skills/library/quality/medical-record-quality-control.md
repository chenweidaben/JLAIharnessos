---
id: medical-record-quality-control
name: AI 病历内涵质控
version: 1.0.0
category: 质控
summary: 批量运行病历内涵质控与病案首页质控，自动生成质控缺陷清单与整改建议。
description: |
  面向质控科与科主任，对在架/归档病历做内涵质控与首页质控。
  技能调用病历质控工具与首页质控工具，汇总缺陷项、严重程度与整改建议，
  不直接修改病历，仅产出质控报告。
icon: SafetyCertificateOutlined
triggers:
  phrases:
    - 病历质控
    - 内涵质控
    - 病历检查
roles:
  - R02
  - R03
  - R04
  - R10
requiredTools:
  - medical_record_quality_check
  - medical_record_front_page_check
requiredAgents:
  - medical-record-qc
requiredKnowledge:
  - inpatient-quality-checklist
requiredCdsRules: []
riskLevel: low
permissions:
  - emr:read:department
  - qc:read:department
inputSchema:
  type: object
  properties:
    department: { type: string }
    startDate: { type: string }
    endDate: { type: string }
    frontPageData: { type: object }
  required: [department, startDate, endDate]
outputSchema:
  type: object
  properties:
    reportId: { type: string }
    defects: { type: array }
enabled: true
tenantScope: true
author: 健澜科技
tags: [质控, 内涵质控, 标杆]
steps:
  - id: qc-run
    kind: agent
    name: AI 内涵质控
    agent: medical-record-qc
    input:
      department: '{{department}}'
      startDate: '{{startDate}}'
      endDate: '{{endDate}}'
  - id: frontpage-check
    kind: tool
    name: 病案首页质控
    tool: medical_record_front_page_check
    input:
      frontPageData: '{{frontPageData}}'
  - id: summarize
    kind: tool
    name: 汇总质控指标
    tool: medical_quality_indicators
    input:
      department: '{{department}}'
      startDate: '{{startDate}}'
      endDate: '{{endDate}}'
---

# AI 病历内涵质控 · 工作流说明

## 适用场景
质控科/科主任按科室、时间段批量运行病历内涵质控与首页质控。

## 执行步骤
1. **AI 内涵质控**：委派 `medical-record-qc` 智能体做逐条规则比对。
2. **病案首页质控**：调用首页质控工具核查主要诊断、手术编码、费用一致性。
3. **汇总指标**：拉本科室质控指标，形成报告。

## 安全与合规
- 只读质控，不修改病历，风险 `low`，无需人工确认即可出报告。
- 报告仅本科室范围内可见；跨科检索受数据范围约束。
