# M251 全量回归扫描 + 性能压测 + FHIR 深化/病历版本报告

**执行时间**：2026-10-20 21:40:00 CST
**BFF 版本**：健澜科技 jlmedaios (Bun.serve)
**扫描方式**：curl 不带 token，DEMO_MODE=1
**BFF 进程**：PID 36896，监听 127.0.0.1:8080

---

## 一、全量回归扫描结果

| 指标 | 数值 |
|---|---|
| **总接口数** | **329** |
| **200 成功** | **329** |
| **404** | **0** |
| **500** | **0** |
| **其他** | **0** |
| **通过率** | **100%** |

### 失败接口清单

**无失败接口。** 全部 329 个里程碑接口在不带 token、DEMO_MODE=1 下均返回 200。

> 口径：M194–M251 全部 m*Routes 里程碑文件去重后的 GET 路径共 329 个（M250 基线 324 + M251 新增 6，其中 1 路径与既有路径去重）。

---

## 二、性能压测结果

**压测目标**：`GET /api/v1/dashboard/stats`
**压测模型**：50 并发 × 每并发 4 次 = 200 次请求，runspace 并发池，DEMO_MODE 内存 mock

| 指标 | 数值 |
|---|---|
| 采样请求数 | 200 |
| 并发数 | 50 |
| 总耗时 | 0.35 s |
| **QPS（吞吐量）** | **570.7 req/s** |
| **成功率** | **100%**（200/200，0 失败） |
| 平均延迟 | 14.8 ms |
| 最小 / 最大延迟 | 2.0 / 89.6 ms |
| P50 | 12.3 ms |
| P95 | 48.9 ms |
| **P99 延迟** | **88.4 ms** |

**结论**：DEMO 态本地 BFF 在 50 并发下成功率 100%，无错误。

---

## 三、M251 新增 6 个 FHIR/病历版本端点验证结果

新路由文件：`src/bff/routes/m251Routes.ts`，已在 `server.ts` 注册（import + `...m251Routes`）。

| # | 接口 | 状态码 | 返回大小 | 业务域 |
|---|---|---|---|---|
| 1 | `GET /api/v1/fhir/documentref` | ✅ 200 | 1128 bytes | FHIR DocumentReference 5 条（EMR/手术/影像/检验/superseded） |
| 2 | `GET /api/v1/fhir/allergyintolerance` | ✅ 200 | 1049 bytes | FHIR AllergyIntolerance 5 条（青霉素/磺胺/海鲜/头孢/花粉） |
| 3 | `GET /api/v1/fhir/immunization` | ✅ 200 | 1211 bytes | FHIR Immunization 5 条（新冠/流感/带状疱疹） |
| 4 | `GET /api/v1/emr/version-diff` | ✅ 200 | 577 bytes | 病历版本 diff（v1.0→v1.1，8 行差异：新增 3/删除 2/修改 3） |
| 5 | `GET /api/v1/emr/version-compare` | ✅ 200 | 909 bytes | 病历版本对比 5 条（含对比人/时间） |
| 6 | `GET /api/v1/emr/version-restore` | ✅ 200 | 722 bytes | 病历版本恢复 3 条（含审批状态） |

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
| M248 | 312 | 100% | CDS 深度 + 护理 NQI（+6） |
| M249 | 318 | 100% | FHIR 网关（Patient/Observation/Condition/MedRequest）+ 事件总线（+6） |
| M250 | 324 | 100% | FHIR 扩展（Encounter/Procedure/DiagnosticReport）+ 角色工作流（+6） |
| **M251** | **329** | **100%** | **FHIR 深化（DocumentRef/Allergy/Immunization）+ 病历版本 diff/compare/restore（+6）** |

**累计端点数**：329（M250 基线 324 + M251 新增 6，去重后净增 5）。

> 未执行任何 git 写操作。

---

**报告生成时间**：2026-10-20 21:40:00 CST
**执行环境**：Windows / Bun.serve / DEMO_MODE=1
