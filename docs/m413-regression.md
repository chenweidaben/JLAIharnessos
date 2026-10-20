# M413 全量回归验证报告

**执行时间**：2026-10-20 15:30 CST
**BFF 状态**：运行中（端口 8080，DEMO_MODE=1）
**执行环境**：Windows / Bun / PowerShell 5.1

---

## 一、总端点数统计

| 维度 | 数量 |
|---|---|
| 全量路由文件 GET 端点数（去重） | **2165** |
| 里程碑路由文件 GET 端点数（M235-M412） | **972** |
| 最近里程碑新增（M408-M411） | +24（M408:6 + M409:6 + M410:6 + M411:6） |

> 统计口径：从 `src/bff/routes/` 下所有 `.ts` 文件中提取 `path: '/api/v1/...'` 并去重。

---

## 二、抽样验证结果（29 个核心 GET 接口）

| # | 业务域 | 接口 | 状态码 | 结果 |
|---|---|---|---|---|
| 1 | 认证 | `/api/v1/auth/me` | ERR | ⚠️ 需登录态（DEMO_MODE 下未短路，预期行为） |
| 2 | 门诊 | `/api/v1/outpatient/visits` | 200 | ✅ |
| 3 | 门诊 | `/api/v1/outpatient/queue` | 200 | ✅ |
| 4 | 住院 | `/api/v1/inpatient/admissions` | 200 | ✅ |
| 5 | 住院 | `/api/v1/inpatient/discharges` | 200 | ✅ |
| 6 | EMR | `/api/v1/emr/list` | ERR | ⚠️ 已知缺口（M361 回归即发现，同类 emr/version-list 可用） |
| 7 | EMR | `/api/v1/emr/templates` | 200 | ✅ |
| 8 | 医嘱 | `/api/v1/orders/list` | 200 | ✅ |
| 9 | 检验 | `/api/v1/lab/results` | 200 | ✅ |
| 10 | 检验 | `/api/v1/lab/reports` | 200 | ✅ |
| 11 | 影像 | `/api/v1/radiology/reports` | 200 | ✅ |
| 12 | 影像 | `/api/v1/radiology/items` | 200 | ✅ |
| 13 | 护理 | `/api/v1/nursing/nqi-indicators` | 200 | ✅ |
| 14 | CDS | `/api/v1/cds/rules` | 200 | ✅ |
| 15 | CDS | `/api/v1/cds/alerts` | 200 | ✅ |
| 16 | FHIR | `/api/v1/fhir/patient` | 200 | ✅ |
| 17 | FHIR | `/api/v1/fhir/observation` | 200 | ✅ |
| 18 | 工作流 | `/api/v1/workflow/tasks` | 200 | ✅ |
| 19 | 工作流 | `/api/v1/workflow/instances` | 200 | ✅ |
| 20 | 安全 | `/api/v1/security/policy` | 200 | ✅ |
| 21 | 安全 | `/api/v1/security/vulnerabilities` | 200 | ✅ |
| 22 | 多租户 | `/api/v1/tenants/list` | 200 | ✅ |
| 23 | 多租户 | `/api/v1/tenants/detail` | 200 | ✅ |
| 24 | BI | `/api/v1/bi/dashboard` | 200 | ✅ |
| 25 | BI | `/api/v1/bi/reports` | 200 | ✅ |
| 26 | 科研 | `/api/v1/research/projects` | 200 | ✅ |
| 27 | 科研 | `/api/v1/research/papers` | 200 | ✅ |
| 28 | 互联网医院 | `/api/v1/telemed/consultations` | 200 | ✅ |
| 29 | 互联网医院 | `/api/v1/telemed/prescriptions` | 200 | ✅ |

### 通过率统计

| 指标 | 数值 |
|---|---|
| 抽样总数 | 29 |
| 通过（200） | **27** |
| 异常（ERR） | 2 |
| **通过率** | **93.1%** |

> 2 个 ERR 均为已知缺口：
> - `auth/me`：需登录态，DEMO_MODE 下未短路（与历史行为一致）
> - `emr/list`：M361 回归即发现的路径差异，同类 `emr/version-list` 可用

---

## 三、tsc 双零验证

| 命令 | 退出码 | 输出 | 状态 |
|---|---|---|---|
| `bun x tsc --noEmit`（仓库根） | 0 | 空（零错误零警告） | ✅ 双零通过 |

---

## 四、BFF 运行状态

| 项目 | 状态 |
|---|---|
| 端口 | 8080 |
| 环境变量 | DEMO_MODE=1, DATABASE_URL=postgres://... |
| 启动方式 | `bun run src/bff/server.ts`（后台进程） |
| 最近重启 | M411 完成后重启（PID 由 Start-Process 分配） |
| 日志文件 | `bff-m411-out.log` / `bff-m411-err.log` |

---

## 五、里程碑进度汇总（M385-M412）

| 里程碑 | 新增端点数 | 累计 |
|---|---|---|
| M385 | +3 | 829 |
| M386 | +2 | 831 |
| M387 | +2 | 833 |
| M388 | +6 | 839 |
| M389 | +3 | 842 |
| M390 | +5 | 847 |
| M391 | +6 | 853 |
| M392 | +6 | 859 |
| M393 | +6 | 865 |
| M394 | +6 | 871 |
| M395 | +6 | 877 |
| M396 | +6 | 883 |
| M397 | +6 | 889 |
| M398 | +6 | 895 |
| M399 | +6 | 901 |
| M400 | +5 | 906 |
| M401 | +6 | 912 |
| M402 | +6 | 918 |
| M403 | +6 | 924 |
| M404 | +6 | 930 |
| M405 | +6 | 936 |
| M406 | +6 | 942 |
| M407 | +6 | 948 |
| M408 | +6 | 954 |
| M409 | +6 | 960 |
| M410 | +6 | 966 |
| M411 | +6 | 972 |
| M412 | 0（已有确认） | 972 |

---

## 六、结论

1. **总端点数**：2165（全量路由）/ 972（里程碑路由）
2. **抽样通过率**：27/29 = **93.1%**（2 个已知 ERR 为历史遗留）
3. **tsc 双零**：✅ 通过（exit 0，零错误）
4. **BFF 运行状态**：✅ 正常（端口 8080，DEMO_MODE=1）

**无 git 操作，无破坏性变更。**
