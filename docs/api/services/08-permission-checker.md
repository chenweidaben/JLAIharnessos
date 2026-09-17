# 权限检查器 API

> 对应源码：`src/security/auth/PermissionChecker.ts`、`PermissionMatrix.ts`、`RoleDefinitions.ts`、`SessionManager.ts`

## 概述

权限检查器基于 RBAC + ABAC 模型，在每次工具调用前校验当前医生是否具备所需权限与角色，并结合患者上下文做细粒度数据授权。

## 核心类

### PermissionChecker

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `hasPermission(user, perm)` | `boolean` | 是否具备某权限点 |
| `check(user, required, context)` | `PermissionResult` | 综合校验（权限 + 角色 + 数据范围） |

### PermissionMatrix

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `getPermissions(role)` | `string[]` | 角色 → 权限点集合 |
| `grant(role, perm)` | `void` | 授权 |

### RoleDefinitions

| 角色 | 典型权限 |
| --- | --- |
| doctor | patient:read、emr:*、order:create、prescription:create |
| nurse | patient:read、order:read、生命体征录入 |
| pharmacist | prescription:audit、drug:read |
| technician | lab:read、imaging:read |
| admin | 系统管理、质量:read、operation:read |

## 调用示例

```typescript
const result = await permissionChecker.check(medicalUser, ["order:create"], patientContext);
if (!result.allowed) throw new MedicalAgentError("PERMISSION_DENIED", result.reason);
```

## 错误码

| 错误码 | 含义 |
| --- | --- |
| `PERMISSION_DENIED` | 权限不足 |
| `ROLE_NOT_ALLOWED` | 角色不匹配 |
| `DATA_SCOPE_DENIED` | 超出可访问患者范围 |

---

*健澜科技数智医院智能体 · 服务 API*
