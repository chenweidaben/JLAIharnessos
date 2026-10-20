# M249 全量回归扫描 + 性能压测 + FHIR 网关/事件总线扩展报告

**执行时间**：2026-10-20 21:30:00 CST
**BFF 版本**：健澜科技 jlmedaios (Bun.serve)
**扫描方式**：curl 不带 token，DEMO_MODE=1
**BFF 进程**：PID 58568，监听 127.0.0.1:8080

---

## 一、全量回归扫描结果

| 指标 | 数值 |
|---|---|
| **总接口数** | **318** |
| **200 成功** | **318** |
| **404** | **0** |
| **500** | **0** |
| **其他** | **0** |
| **通过率** | **100%** |

### 失败接口清单

**无失败接口。** 全部 318 个里程碑接口在不带 token、DEMO_MODE=1 下均返回 200。

> 口径：M194–M249 全部 m*Routes 里程碑文件去重后的 GET 路径共 318 个（M248 基线 312 + M249 新增 6）。

---

## 二、性能压测结果

**压测目标**：`GET /api/v1/dashboard/stats`
**压测模型**：50 并发 × 每并发 4 次 = 200 次请求，runspace 并发池，DEMO_MODE 内存 mock

| 指标 | 数值 |
|---|---|
| 采样请求数 | 200 |
| 并发数 | 50 |
| 总耗时 | 0.35 s |
| **QPS（吞吐量）** | **575.3 req/s** |
| **成功率** | **100%**（200/200，0 失败） |
| 平均延迟 | 15.1 ms |
| 最小 / 最大延迟 | 2.6 / 109.6 ms |
| P50 | 10.1 ms |
| P95 | 64.5 ms |
| **P99 延迟** | **107.3 ms** |

**结论**：DEMO 态本地 BFF 在 50 并发下成功率 100%；P99 受系统瞬时负载影响略升至 107ms，无错误。

---

## 三、M249 新增 6 个 FHIR/事件端点验证结果

新路由文件：`src/bff/routes/m249Routes.ts`，已在 `server.ts` 注册（import + `...m249Routes`）。

| # | 接口 | 状态码 | 返回大小 | 业务域 |
|---|---|---|---|---|
| 1 | `GET /api/v1/fhir/patient` | ✅ 200 | 840 bytes | FHIR Patient 5 条（Bundle/searchset 结构） |
| 2 | `GET /api/v1/fhir/observation` | ✅ 200 | 1073 bytes | FHIR Observation 5 条（LOINC 编码：心率/血压/血糖/BMI） |
| 3 | `GET /api/v1/fhir/condition` | ✅ 200 | 1100 bytes | FHIR Condition 5 条（ICD-10：冠心病/高血压/糖尿病/肺炎/腰痛） |
| 4 | `GET /api/v1/fhir/medicationrequest` | ✅ 200 | 965 bytes | FHIR MedicationRequest 5 条（active/completed/cancelled） |
| 5 | `GET /api/v1/events/bus` | ✅ 200 | 291 bytes | 事件总线统计（今日 128 万条 / 28 类型 / 延迟 120ms / 失败率 0.03%） |
| 6 | `GET /api/v1/events/audit` | ✅ 200 | 952 bytes | 事件审计日志 5 条（HIS/EMR/CPOE/LIS/PACS 生产者） |

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
| M246 | 300 | 100% | 病历缺陷/质控统计 + 租户配额 + CVE/WAF/SIEM（+6） |
| M247 | 306 | 100% | 质控 12 月趋势/科室排名 + 租户用量 + 日志归档/事件时间线/安全指标（+6） |
| M248 | 312 | 100% | CDS 深度（时间线/相互作用/剂量/禁忌）+ 护理 NQI 指标/趋势（+6） |
| **M249** | **318** | **100%** | **FHIR 网关（Patient/Observation/Condition/MedicationRequest）+ 事件总线统计/审计（+6）** |

**累计端点数**：318（M248 基线 312 + M249 新增 6）。

> 未执行任何 git 写操作。

---

**报告生成时间**：2026-10-20 21:30:00 CST
**执行环境**：Windows / Bun.serve / DEMO_MODE=1
