---
id: admin-skill-market
name: 技能市场管理
version: 1.0.0
category: 系统管理
summary: 审核、发布、上下架院内技能，管理技能版本与灰度发布。
description: 管理员审核业务部门提交的技能，版本化发布到市场。
icon: ShopOutlined
triggers:
  phrases: [技能市场, 技能审核]
roles: [R01, R02]
requiredTools: []
requiredAgents: []
requiredKnowledge: []
requiredCdsRules: []
riskLevel: medium
permissions: [system:skill:manage]
steps: []
---

# 技能市场管理
提交 → 校验 → 审核 → 版本发布/灰度/回滚。
