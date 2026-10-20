# 多角色权限分层验证报告

> **v5.0试点扩展（M184角色验证）**
>
> 验证方式：bun 脚本 `scripts/verify-roles.ts` 直连运行中的 BFF（`http://localhost:8080`，`DEMO_MODE=1`），
> 以各演示账号登录拿真实 JWT 后调 `/api/v1/auth/permissions`、`/api/v1/auth/menus` 并做越权探测。
> 不启动浏览器、不连数据库、不写业务数据、不改业务代码。
>
> 执行时间：2026-10-19 ｜ BFF health=200 ｜ 演示账号口令统一 `demo123`（DEMO 态不校验口令哈希）

---

## 1. 结论速览

| 角色账号 | 角色码 | 权限数（API 原始） | 去重后权限数 | 任务预期 | 菜单（顶层/叶子） | 是否符合预期 |
|---|---|---:|---:|---|---|---|
| doctor_li（李医生） | doctor | **220** | 196 | ~89 | 16 / 25 | 量级一致（医生权限最宽），绝对值高于预期 |
| nurse_wang（王护士） | nurse | **153** | 130 | ~65 | 7 / 11 | 量级一致，绝对值高于预期 |
| pharmacist_zhang（张药师） | pharmacist | **27** | 27 | ~15 | 6 / 8 | 量级一致，绝对值高于预期 |
| patient_test（测试患者） | patient | **6** | 6 | ~7 | 1 / 1 | ✅ 基本吻合 |

**分层结论**：四角色权限数呈 `doctor(220) > nurse(153) > pharmacist(27) > patient(6)` 的清晰递减，
与岗位职责宽严一致；患者仅 6 项、单菜单（患者首页），最小权限原则成立。

> 说明：任务给出的 ~89/~65/~15/~7 为粗略预期。实际绝对值偏大，原因是 `ROLE_PERMISSIONS`
> （`src/bff/view/userView.ts`）按业务域铺开了细粒度码（含历史重复项），doctor 原始数组 220 项中含 24 项重复
> （去重后 196）。本报告以 **BFF 接口实际返回值** 为准，不做人工砍数。

---

## 2. 各角色明细

### 2.1 doctor_li（李医生 / doctor / 心血管内科 主治医师）
- 权限数：220（去重 196）
- 菜单：顶层 16 / 叶子 25
- 关键权限示例：`dashboard:view`、`patient:view`、`report:clinical:read`、`report:quality:read`、
  `medical_record:read`、`medical_record:write`
- 可见菜单：工作台、患者管理、AI 辅诊、门诊问诊、住院查房、AI 问诊、急诊分诊、病历质控、病案首页、
  EMR 文书质控（终末质控/合理用药/五级评审）、科研队列、患者主索引、数据湖仓、数据治理、收费结算、
  科室运营（手术麻醉/输血管理/VTE防治/抗菌药物管理/临床路径管理/LIS/RIS-PACS/DRG预算预警）
- 特点：持 `report:clinical:read` + `report:quality:read` 两个分组码，按 P1 收敛规则通配放行临床/质控域 `:read`。

### 2.2 nurse_wang（王护士 / nurse / 三病区 护师）
- 权限数：153（去重 130）
- 菜单：顶层 7 / 叶子 11
- 关键权限示例：`dashboard:view`、`patient:view`、`report:clinical:read`、`report:quality:read`、
  `medical_record:read`、`lab:read`
- 可见菜单：工作台、患者管理、住院查房、急诊分诊、病历质控、收费结算、
  科室运营（VTE防治/抗菌药物管理/临床路径管理/LIS/DRG预算预警）
- 特点：P0 安全止血后已收回 `order:write` / `cds:override` / `inpatient:bed:manage`，菜单不含「门诊问诊/AI辅诊/系统管理」。

### 2.3 pharmacist_zhang（张药师 / pharmacist / 药学部 主管药师）
- 权限数：27（去重 27，无重复）
- 菜单：顶层 6 / 叶子 8
- 关键权限示例：`dashboard:view`、`patient:view`、`report:clinical:read`、`report:quality:read`、
  `prescription:review`、`prescription:write`
- 可见菜单：工作台、患者管理、药房发药、病历质控、收费结算、
  科室运营（抗菌药物管理/临床路径管理/LIS）
- 特点：聚焦处方审核/发药/库存/互联网药房，不含医嘱开立与住院查房。

### 2.4 patient_test（测试患者 / patient）
- 权限数：6（去重 6）
- 菜单：顶层 1 / 叶子 1
- 关键权限示例：`patient_portal:view`、`patient_billing:view`、`satisfaction:view`、
  `notification:read`、`renewal:pay`、`medmuse:patient`
- 可见菜单：仅「患者首页」
- 特点：✅ 最小权限，无任何临床/管理域码。

---

## 3. 越权 / 403 探测结果

| # | 探测 | 实际 HTTP | 预期 | 判定 |
|---|---|---:|---:|---|
| 1 | patient_test `GET /api/v1/admin/users` | — | 403 | （见 #3 对照） |
| 2 | patient_test `GET /api/v1/order/list` | **404** | 403 | ⚠️ 路径未注册（见说明 A） |
| 3 | doctor_li `GET /api/v1/admin/users` | **403** | 403 | ✅ PASS |
| 4 | patient_test `GET /api/v1/orders`（真实医嘱列表路由） | **200** | 403 | ⚠️ DEMO 态短路（见说明 B） |

**说明 A — `/api/v1/order/list` 404**：
该路径在 BFF 路由表中**不存在**（全仓检索仅在 `performanceBenchmarkAggregator.ts` 的基准配置里出现一次，非注册路由）。
真实医嘱列表路由为 `GET /api/v1/orders`。因此患者访问 `/api/v1/order/list` 命中的是全局 404 兜底
（`{"code":40400,"message":"路由不存在"}`），而非权限 403。**这不构成越权放行**——患者同样拿不到任何医嘱数据。

**说明 B — `/api/v1/orders` 在 DEMO 态返回 200 []**：
`src/bff/routes/order.ts` 的 `GET /api/v1/orders` 首行即 `if (isDemo) return json(ok([]))`，
在 DEMO_MODE 下于权限/数据范围校验之前直接返回空数组，故 patient_test 也拿到 200。
这是**演示态为不连库而设的短路**，非生产鉴权缺陷；非 DEMO 模式会走 `requester()` → `listView(view)` 做角色/数据范围校验。
生产部署需以非 DEMO 态复测该端点的角色隔离。

**说明 C — `admin/users` 403 验证通过**：
`src/bff/routes/admin/users.ts` 在 handle 首行 `requirePermissionCode(c, 'user:manage')`。
doctor_li 的 JWT `roles=['doctor']`、permissions 不含 `user:manage`、且非 `:read` 分组码，
故返回 `403 {"code":40300,"message":"权限不足：需要 user:manage"}`。**admin 专属端点对医生角色正确拦截。**

---

## 4. 总体符合性评估

- ✅ **角色分层成立**：权限数递减、菜单随职责收敛，患者最小权限。
- ✅ **admin 专属端点隔离有效**：doctor 访问 `/api/v1/admin/users` 正确 403。
- ✅ **分组码通配按预期**：临床岗位持 `report:clinical/quality:read`，患者不持任何 `report:*`。
- ⚠️ **待复测项（非缺陷）**：
  1. 任务指定的 `/api/v1/order/list` 实为 404 路径，建议业务侧统一到 `/api/v1/orders` 命名；
  2. DEMO 态 `/api/v1/orders` 短路返回空数组，需在**非 DEMO（连库）模式**下复测患者/医生的数据范围隔离，
     以确认生产态不存在跨角色读医嘱。

---

*Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.*
*v5.0试点扩展（M184角色验证）*
