# 健澜科技 jlmedaios - P14 路由路径诊断报告

**日期**：2026-10-19
**类型**：只读诊断（不修改代码）

---

## 1. Vite Proxy 配置检查

| 配置项 | 值 | 状态 |
|---|---|---|
| /api 代理目标 | `http://127.0.0.1:8080` | ✅ 正常 |
| /ws 代理目标 | `ws://127.0.0.1:8080` | ✅ 正常 |
| changeOrigin | true | ✅ 正常 |
| 路径 rewrite | 无（透传） | ✅ 正常 |

**结论**：Vite proxy 配置正常，/api/v1/** 正确代理到 BFF 8080 端口。

---

## 2. 7 个路由诊断结果

### 2.1 /patients
| 检查项 | 结果 |
|---|---|
| 路由路径 | `path="patients"`（第 3394 行） |
| 守卫 | `RequirePermission permission="patient:view"` |
| 组件 | `<PatientList />` |
| 路由层级 | AppLayout 下（RequireAuth 内） |
| **诊断** | 路由存在，守卫为 patient:view。admin 账号有 patient:view 权限（之前登录测试确认）。如果返回 404，可能是组件懒加载失败。 |

### 2.2 /front-page
| 检查项 | 结果 |
|---|---|
| 路由路径 | `path="front-page"`（第 6690 行） |
| 守卫 | **无 RequirePermission**（直接 FrontPage） |
| 组件 | `<FrontPage />` |
| 路由层级 | AppLayout 下 |
| **诊断** | 路由存在，无权限守卫。如果返回 404，可能是组件懒加载失败或路径拼写错误。 |

### 2.3 /pharmacy
| 检查项 | 结果 |
|---|---|
| 路由路径 | `path="pharmacy"`（第 6682 行） |
| 守卫 | `RequirePermission permission="pharmacy:view"` |
| 组件 | `<Pharmacy />` |
| 路由层级 | AppLayout 下 |
| **诊断** | 路由存在，守卫为 pharmacy:view。admin 账号有 pharmacy:view 权限。如果返回 404，可能是组件懒加载失败。 |

### 2.4 /billing/bill-list
| 检查项 | 结果 |
|---|---|
| 路由路径 | `path="billing/bill-list"`（第 3536 行） |
| 守卫 | **无 RequirePermission**（直接 BillListPage） |
| 组件 | `<BillListPage />` |
| 路由层级 | AppLayout 下 |
| **诊断** | 路由存在，无权限守卫。用户报告 "EMPTY" 可能是页面渲染为空，不是 404。 |

### 2.5 /doctor-workbench
| 检查项 | 结果 |
|---|---|
| 路由路径 | `path="doctor-workbench"`（第 7271 行） |
| 守卫 | `RequirePermission permission="workbench:view"` |
| 组件 | `<DoctorWorkbenchPage />` |
| 路由层级 | AppLayout 下 |
| **诊断** | 路由存在，守卫为 workbench:view。**关键问题**：admin 账号是否有 workbench:view 权限？之前登录测试显示 admin 的权限列表很长，但需要确认是否包含 workbench:view。 |

### 2.6 /nurse-station
| 检查项 | 结果 |
|---|---|
| 路由路径 | `path="nurse-station"`（第 7031 行） |
| 守卫 | `RequirePermission permission="nurse_station:read"` |
| 组件 | `<NurseStationPage />` |
| 路由层级 | AppLayout 下 |
| **诊断** | 路由存在，守卫为 nurse_station:read。**关键问题**：admin 账号是否有 nurse_station:read 权限？ |

### 2.7 /improvement-tasks
| 检查项 | 结果 |
|---|---|
| 路由路径 | `path="improvement-tasks"`（第 7341 行） |
| 守卫 | `RequirePermission permission="improvement_task:handle"` |
| 组件 | `<ImprovementTaskPage />` |
| 路由层级 | AppLayout 下 |
| **诊断** | 路由存在，守卫为 improvement_task:handle。**关键问题**：admin 账号是否有 improvement_task:handle 权限？ |

---

## 3. 最可能的共同根因

### 假设 1：RequirePermission 守卫拦截 → 重定向 /403
**证据**：
- 用户浏览器当前显示 `http://localhost:5173/403`
- 多个路由都有 RequirePermission 守卫
- P4 阶段修改了权限码补全，可能引入了新的权限要求

**需确认**：
- admin 登录后，permissions 列表是否包含 `workbench:view` / `nurse_station:read` / `improvement_task:handle`？
- 如果不包含，RequirePermission 会重定向到 /403

### 假设 2：组件懒加载失败 → 白屏或 404
**证据**：
- 所有页面都用 `lazy(() => import(...))` 懒加载
- 如果组件文件路径不对，会导致懒加载失败

**需确认**：
- `@/pages/doctorWorkbench` / `@/pages/nurseStation` / `@/pages/improvementTask` 文件是否存在？

### 假设 3：路由嵌套层级问题
**证据**：
- 7 个路由都在 AppLayout 下的子路由中
- 如果 AppLayout 本身有问题，所有子路由都会受影响

---

## 4. 建议修复方向（不执行）

1. **优先验证假设 1**：用 admin 登录，检查 JWT token 中的 permissions 列表是否包含 `workbench:view` / `nurse_station:read` / `improvement_task:handle`
2. **如果权限缺失**：在 BFF userView.ts 中给 admin 角色补充这些权限码
3. **如果权限存在**：检查组件文件是否存在（Glob 搜索 `web/src/pages/doctorWorkbench*` 等）
4. **如果组件存在**：检查浏览器控制台是否有懒加载错误

---

## 5. 总结

| 项目 | 结果 |
|---|---|
| Vite proxy | ✅ 正常 |
| 7 个路由是否存在 | ✅ 全部存在 |
| 最可能根因 | **RequirePermission 权限码不匹配导致重定向 /403** |
| 当前浏览器状态 | `http://localhost:5173/403`（被守卫拦截） |
| 建议下一步 | 用 admin 登录，解码 JWT token 检查 permissions 列表 |
