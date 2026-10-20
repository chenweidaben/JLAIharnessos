# M250 全量回归扫描 + 性能压测 + FHIR 扩展/角色工作流报告

**执行时间**：2026-10-20 21:35:00 CST
**BFF 版本**：健澜科技 jlmedaios (Bun.serve)
**扫描方式**：curl 不带 token，DEMO_MODE=1
**BFF 进程**：PID 51636，监听 127.0.0.1:8080

---

## 一、全量回归扫描结果

| 指标 | 数值 |
|---|---|
| **总接口数** | **324** |
| **200 成功** | **324** |
| **404** | **0** |
| **500** | **0** |
| **其他** | **0** |
| **通过率** | **100%** |

### 失败接口清单

**无失败接口。** 全部 324 个里程碑接口在不带 token、DEMO_MODE=1 下均返回 200。

> 口径：M194–M250 全部 m*Routes 里程碑文件去重后的 GET 路径共 324 个（M249 基线 318 + M250 新增 6）。

---

## 二、性能压测结果

**压测目标**：`GET /api/v1/dashboard/stats`
**压测模型**：50 并发 × 每并发 4 次 = 200 次请求，runspace 并发池，DEMO_MODE 内存 mock

| 指标 | 数值 |
|---|---|
| 采样请求数 | 200 |
| 并发数 | 50 |
| 总耗时 | 0.27 s |
| **QPS（吞吐量）** | **732.4 req/s** |
| **成功率** | **100%**（200/200，0 失败） |
| 平均延迟 | 11.3 ms |
| 最小 / 最大延迟 | 1.0 / 66.4 ms |
| P50 | 8.9 ms |
| P95 | 28.5 ms |
| **P99 延迟** | **66.1 ms** |

**结论**：DEMO 态本地 BFF 在 50 并发下 P99 < 70ms、QPS ≈ 732，无错误。

---

## 三、M250 新增 6 个 FHIR/工作流端点验证结果

新路由文件：`src/bff/routes/m250Routes.ts`，已在 `server.ts` 注册（import + `...m250Routes`）。

| # | 接口 | 状态码 | 返回大小 | 业务域 |
|---|---|---|---|---|
| 1 | `GET /api/v1/fhir/encounter` | ✅ 200 | 1133 bytes | FHIR Encounter 5 条（门诊/住院/急诊，finished/in-progress） |
| 2 | `GET /api/v1/fhir/procedure` | ✅ 200 | 1258 bytes | FHIR Procedure 5 条（CAG/PCI/胸穿/CGM/封闭注射） |
| 3 | `GET /api/v1/fhir/diagnosticreport` | ✅ 200 | 1328 bytes | FHIR DiagnosticReport 5 条（CT/血常规/血糖/血气/MRI） |
| 4 | `GET /api/v1/workflow/doctor` | ✅ 200 | 255 bytes | 医生工作流（待诊 12 / 接诊中 3 / 已完成 28，今日 43 人次） |
| 5 | `GET /api/v1/workflow/nurse` | ✅ 200 | 245 bytes | 护士工作流（待执行 18 / 执行中 6 / 已完成 64，今日 88 任务） |
| 6 | `GET /api/v1/workflow/pharmacist` | ✅ 200 | 274 bytes | 药师工作流（待审 9 / 已审 52 / 退药 2，今日 63 处方） |

**Result: 6 / 6 ✅** —— 全部新建并注册，不带 token 均 200。

---

## 四、tsc 双零验证

| 目录 | 命令 | 结果 |
|---|---|---|
| 仓库根目录 | `bun x tsc --noEmit` | ✅ exit 0，零错误、零输出 |

---

## 五、历史批次对比

| 版本 | 接口数 | 通过率 | 关键交付 |
|---|---|---|---|
| M247 | 306 | 100% | 质控 12 月趋势/科室排名 + 租户用量 + 日志归档/事件时间线/安全指标（+6） |
| M248 | 312 | 100% | CDS 深度（时间线/相互作用/剂量/禁忌）+ 护理 NQI 指标/趋势（+6） |
| M249 | 318 | 100% | FHIR 网关（Patient/Observation/Condition/MedicationRequest）+ 事件总线统计/审计（+6） |
| **M250** | **324** | **100%** | **FHIR 扩展（Encounter/Procedure/DiagnosticReport）+ 角色工作流（医生/护士/药师）（+6）** |

**累计端点数**：324（M249 基线 318 + M250 新增 6）。

> 未执行任何 git 写操作。

---

**报告生成时间**：2026-10-20 21:35:00 CST
**执行环境**：Windows / Bun.serve / DEMO_MODE=1
