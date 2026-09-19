---
id: admin-skill-orchestrator
name: 低代码技能编排器
version: 1.0.0
category: 系统管理
summary: 可视化拖拽编排工作流步骤，选择工具/知识/角色，试运行并发布技能。
description: 系统管理员/业务专家无需代码即可组合出科室专属技能。
icon: BgColorsOutlined
triggers:
  phrases: [编排技能, 技能编排]
roles: [R01, R02]
requiredTools: []
requiredAgents: []
requiredKnowledge: []
requiredCdsRules: []
riskLevel: low
permissions: [system:skill:manage]
steps: []
---

# 低代码技能编排器
可视化画布：拖入工具/智能体/知识/人工确认节点，连线成工作流；
实时试运行、版本保存、发布到技能市场。
