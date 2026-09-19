---
id: admin-tenant-management
name: 多租户/一院多区管理
version: 1.0.0
category: 系统管理
summary: 多医院/多院区数据隔离配置，租户级启用技能、覆盖参数，本体不可改。
description: 集团化医院多院区运营：每个租户独立数据空间与技能开关。
icon: ClusterOutlined
triggers:
  phrases: [租户管理, 院区管理]
roles: [R01]
requiredTools: []
requiredAgents: []
requiredKnowledge: []
requiredCdsRules: []
riskLevel: medium
permissions: [system:tenant:manage]
steps: []
---

# 多租户/一院多区管理
- 租户/院区创建与数据隔离。
- 租户级覆盖技能 enabled 与参数；系统技能本体只读。
