# jlmedaios · 权限运行时可配置化（RBAC/ABAC 管理能力）阶段交付报告

- 交付时间：2026-09-19
- 范围：在静态 `PERMISSION_MATRIX` 之上叠加"运行时可配置、可管理"的权限覆盖层（overlay），并提供管理 API；默认行为与静态矩阵完全一致（零回归）。
- 公司/系统：杭州健澜科技 · jlmedaios（数智医院智能体操作系统）

---

## 1. 新增文件清单（严格只新增，未改任何既有文件）

| 文件 | 职责 |
|---|---|
| `src/security/auth/PermissionConfigStore.ts` | 运行时覆盖层存储（基线+overlay、版本号、审计、原子快照） |
| `src/security/auth/AdminPermissionService.ts` | 面向路由的服务层（list/get/update/grant/revoke/evaluate） |
| `src/bff/routes/admin/permissions.ts` | BFF 管理路由（导出 `permissionAdminRoutes: RouteDef[]`，未自行注册） |
| `tests/unit/security/PermissionConfigStore.test.ts` | 覆盖层单元测试（11 例） |
| `tests/unit/security/AdminPermissionService.test.ts` | 服务层单元测试（15 例） |

未触碰 `RoleDefinitions.ts` / `PermissionMatrix.ts` 的任何静态导出，未改 `PermissionChecker.ts` / `server.ts` / middleware / 既有医疗工具。

## 2. overlay 数据结构

```ts
EntryOverride {
  allowedRoles?: RoleCode[]                 // 整体替换允许角色列表
  defaultScope?: DataScope                   // 覆盖默认数据范围
  requireMfa?: boolean                       // 覆盖 MFA 强制
  riskLevel?: 'low'|'medium'|'high'|'critical'
  roleScopes?: Partial<Record<RoleCode, DataScope>>  // 按角色定制数据范围（科室/病区维度）
}
```

- 存储：`Map<"module:action", EntryOverride>`，启动为空，基线来自静态 `PERMISSION_MATRIX`。
- 生效条目 = 基线字段 ∪ overlay 同名字段；overlay 未提供的字段沿用基线。
- 每次写操作版本号 `version +1` 并追加 `PermissionAuditRecord`（版本/时间/操作人/类型/目标/前后快照），审计上限 10000 条防内存膨胀。
- 并发安全：单线程事件循环下所有公共读写为同步方法（无 await 让出点），"读-改-写"原子完成；对外采用不可变快照 + 整体替换，读侧不会读到半更新状态。
- 导出 `exportState()` 便于后续持久化/导出。

## 3. 管理 API 端点清单

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/admin/permissions/matrix` | 生效矩阵视图（version/overlayCount/modules/actions/entries） |
| GET | `/api/v1/admin/permissions/roles` | 12 个角色定义 |
| PUT | `/api/v1/admin/permissions/entry` | 更新某条目（Zod 校验入参） |
| POST | `/api/v1/admin/permissions/grant` | 授权（可带 scope） |
| DELETE | `/api/v1/admin/permissions/grant?role=&module=&action=` | 撤销 |

全部 `auth:true`，`requireRole(c,'admin')` 守卫（未登录 401、非管理员 403）；服务层二次校验 `SYSTEM_ADMIN`，越权抛 `PermissionDeniedError`→403。入参用 Zod 从既有枚举派生，非法值→400。

> 接线说明：本文件仅 `export const permissionAdminRoutes: RouteDef[]`，未在 `server.ts` 注册（按要求由装配方统一接线）。

## 4. 默认零回归如何保证

- overlay 为空时，`getEffectiveEntry()` 直接返回静态基线对象**同一引用**，逐字段一致；测试用例"空覆盖层时每个生效条目与静态矩阵逐字段一致"断言 `toBe(base)` 与字段 `toEqual`。
- `listEffectiveMatrix()` 在无覆盖时逐项返回基线引用，长度/顺序与静态矩阵一致。
- `evaluate()` 在无覆盖时完全委托既有 `PermissionChecker`（RBAC+数据范围+ABAC），行为不变。
- 每个测试用例使用 `new PermissionConfigStore()` / `new AdminPermissionService()` 全新实例，覆盖不泄漏到全局基线。

## 5. 测试覆盖场景

**PermissionConfigStore（11）**：空覆盖零回归、getOverlay 空、updateEntry 生效+版本+审计、版本单调递增、grant 加角色+scope、revoke 移除+清 scope、grant 幂等、roleScopes 科室/病区收敛、reset 单条目、resetAll、实例隔离。

**AdminPermissionService（15）**：listRoles=12、listMatrix 视图、getEntry overlayActive=false、不存在条目抛错；非 SYSTEM_ADMIN 的 grant/updateEntry/revoke 全部被拒；管理员 grant/revoke 成功且落审计；非法 riskLevel/dataScope 抛错；**医疗红线**——禁止把已强制 MFA 的高风险条目降级为不要求 MFA（PATIENT.EXPORT requireMfa:false 被拒）、允许新增 requireMfa:true；evaluate 无覆盖时复用 PermissionChecker（访客读患者 DENY）、覆盖授权后提升 ALLOW、撤销后恢复 DENY。

## 6. 验证命令与结果

- `bunx tsc --noEmit`：**本次新增/修改文件 0 错误**。
  - 注：仓库现存 `src/skills/executor.ts`、`src/skills/loader.ts` 有 6 个 tsc 报错（`SkillParseError.name` 缺失、状态枚举不匹配），属另一并行模块在制文件，不在本阶段允许改动范围内，未触碰，留待整合方统一修复。
- `bun test tests/unit/security`：**268 pass / 0 fail / 12 文件 / 807 expect**。
- `bun test`（全量）：**1113 pass / 0 fail / 100 文件 / 5640 expect**（基线 1058/93，只增不减；净增含本阶段 26 例及其他并行模块新增）。

## 7. 医疗安全红线落实

- 写操作强制 SYSTEM_ADMIN 二次校验 + 完整审计（谁改的、前后快照）。
- 不允许关闭已强制 MFA 的高风险操作（处方/医嘱/系统管理/患者导出），只允许增强。
- 高风险写操作仍走既有三级风险确认/审计链路，本阶段未弱化任何既有校验。

## 8. 遗留问题 / 后续建议

1. `src/skills/*` 的 6 个 tsc 报错需整合方修复（非本阶段范围）。
2. overlay 当前为进程内内存态；建议后续接入 `exportState()` 做持久化（DB/配置中心），并在 PermissionChecker 读取路径接入 overlay，使运行时授权对全链路 enforcement 生效（当前 evaluate 已桥接，其余既有调用仍读静态矩阵）。
3. 前端管理页（权限矩阵可视化编辑）待配套开发。
