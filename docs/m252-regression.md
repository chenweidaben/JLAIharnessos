# M252 全量回归扫描 + 性能压测 + FHIR 扩展/患者 360 深化报告

**执行时间**：2026-10-20 21:45:00 CST
**BFF 版本**：健澜科技 jlmedaios (Bun.serve)
**扫描方式**：curl 不带 token，DEMO_MODE=1
**BFF 进程**：PID 43128，监听 127.0.0.1:8080

---

## 一、全量回归扫描结果

| 指标 | 数值 |
|---|---|
| **总接口数** | **335** |
| **200 成功** | **335** |
| **404** | **0** |
| **500** | **0** |
| **其他** | **0** |
| **通过率** | **100%** |

### 失败接口清单

**无失败接口。** 全部 335 个里程碑接口在不带 token、DEMO_MODE=1 下均返回 200。

> 口径：M194–M252 全部 m*Routes 里程碑文件去重后的 GET 路径共 335 个（M251 基线 329 + M252 新增 6）。

---

## 二、性能压测结果

**压测目标**：`GET /api/v1/dashboard/stats`
**压测模型**：50 并发 × 每并发 4 次 = 200 次请求，runspace 并发池，DEMO_MODE 内存 mock

| 指标 | 数值 |
|---|---|
| 采样请求数 | 200 |
| 并发数 | 50 |
| 总耗时 | 0.33 s |
| **QPS（吞吐量）** | **603.4 req/s** |
| **成功率** | **100%**（200/200，0 失败） |
| 平均延迟 | 14.6 ms |
| 最小 / 最大延迟 | 1.5 / 89.8 ms |
| P50 | 10.8 ms |
| P95 | 57.2 ms |
| **P99 延迟** | **88.9 ms** |

**结论**：DEMO 态本地 BFF 在 50 并发下成功率 100%，无错误。

---

## 三、M252 新增 6 个 FHIR/患者360端点验证结果

新路由文件：`src/bff/routes/m252Routes.ts`，已在 `server.ts` 注册（import + `...m252Routes`）。

| # | 接口 | 状态码 | 返回大小 | 业务域 |
|---|---|---|---|---|
| 1 | `GET /api/v1/fhir/location` | ✅ 200 | 796 bytes | FHIR Location 5 条（心内科/内分泌/急诊/骨科/老年科，含床位数） |
| 2 | `GET /api/v1/fhir/practitioner` | ✅ 200 | 845 bytes | FHIR Practitioner 5 条（主任/副主任/主治，含执业证号） |
| 3 | `GET /api/v1/fhir/organization` | ✅ 200 | 1189 bytes | FHIR Organization 5 条（总院/滨江院区/科室/互联网医院） |
| 4 | `GET /api/v1/patient/360-overview` | ✅ 200 | 647 bytes | 患者 360 概览（基本信息+诊断+用药+影像+检验） |
| 5 | `GET /api/v1/patient/360-timeline` | ✅ 200 | 759 bytes | 患者 360 时间线 5 条（出院/手术/用药/检查/就诊） |
| 6 | `GET /api/v1/patient/360-risk` | ✅ 200 | 408 bytes | 患者风险评估（中风险，再入院概率 32%，4 条建议） |

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
| M249 | 318 | 100% | FHIR 网关（Patient/Observation/Condition/MedRequest）+ 事件总线（+6） |
| M250 | 324 | 100% | FHIR 扩展（Encounter/Procedure/DiagnosticReport）+ 角色工作流（+6） |
| M251 | 329 | 100% | FHIR 深化（DocumentRef/Allergy/Immunization）+ 病历版本（+6） |
| **M252** | **335** | **100%** | **FHIR 扩展（Location/Practitioner/Organization）+ 患者 360（overview/timeline/risk）（+6）** |

**累计端点数**：335（M251 基线 329 + M252 新增 6）。

> 未执行任何 git 写操作。

---

**报告生成时间**：2026-10-20 21:45:00 CST
**执行环境**：Windows / Bun.serve / DEMO_MODE=1
