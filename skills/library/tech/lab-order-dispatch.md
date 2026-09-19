---
id: tech-lab-order-dispatch
name: 检验申请调度与状态跟踪
version: 1.0.0
category: 医技
summary: 自动接收并调度检验申请，跟踪标本状态与报告回传。
description: 检验科接收申请、核收标本、回传结果，异常状态提醒。
icon: ClusterOutlined
triggers:
  phrases: [检验申请, 标本]
roles: [R10]
requiredTools:
  - order_lab_test
  - get_lab_result
requiredAgents: []
requiredKnowledge: [lab-specimen-sop]
requiredCdsRules: []
riskLevel: low
permissions: [lab:read:department, lab:update:department]
steps:
  - id: list
    kind: tool
    name: 读取待处理检验申请
    tool: get_lab_result
    input: { status: pending }
---

# 检验申请调度
1. 接收申请。
2. 跟踪标本与回传；超时提醒。
