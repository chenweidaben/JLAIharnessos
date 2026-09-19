---
id: admin-agent-factory
name: 智能体工厂
version: 1.0.0
category: 系统管理
summary: 基于模板快速克隆/二次编辑刚需智能体，生成可分发的 AgentPackage。
description: 从十大刚需智能体模板克隆，改提示词与工具集即可上线新智能体。
icon: RobotOutlined
triggers:
  phrases: [智能体工厂, 创建智能体]
roles: [R01]
requiredTools: []
requiredAgents: []
requiredKnowledge: []
requiredCdsRules: []
riskLevel: low
permissions: [system:agent:manage]
steps: []
---

# 智能体工厂
模板克隆 → 改提示词/工具集 → 校验 → 发布。
