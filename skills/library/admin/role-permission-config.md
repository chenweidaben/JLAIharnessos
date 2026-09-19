---
id: admin-role-permission-config
name: 角色与权限可配置
version: 1.0.0
category: 系统管理
summary: 可视化配置 RBAC/ABAC 角色、数据范围到科室/病区，权限矩阵即改即生效。
description: 每个用户权限可管理、可配置，数据权限到科室/病区。
icon: TeamOutlined
triggers:
  phrases: [权限配置, 角色配置]
roles: [R01]
requiredTools: []
requiredAgents: []
requiredKnowledge: []
requiredCdsRules: []
riskLevel: high
permissions: [system:role:manage, system:perm:manage]
steps: []
---

# 角色与权限可配置
- 角色矩阵编辑：12 角色 × 权限点 × 数据范围。
- 变更经双签后生效并审计。
