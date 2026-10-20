# M290 全量回归测试 + 性能压测报告

**执行时间**：2026-10-20 23:50:00 CST
**BFF 版本**：健澜科技 jlmedaios (Bun.serve)

---

## 一、总端点数

| 统计口径 | 数量 |
|---|---|
| 里程碑路由文件总数 | 40+ 个 m*Routes.ts 文件 |
| **总端点数（去重）** | **397** |

---

## 二、抽样验证（30 个接口随机抽样）

**抽样通过率：30/30 = 100%**

| # | 接口 | 状态码 |
|---|---|---|
| 1 | `/api/v1/cds/interaction-check` | ✅ 200 |
| 2 | `/api/v1/blood/requests` | ✅ 200 |
| 3 | `/api/v1/notification/inbox` | ✅ 200 |
| 4 | `/api/v1/oncology/chemo` | ✅ 200 |
| 5 | `/api/v1/physical/reports` | ✅ 200 |
| 6 | `/api/v1/community/centers` | ✅ 200 |
| 7 | `/api/v1/nursing/shift` | ✅ 200 |
| 8 | `/api/v1/surgery/detail-full` | ✅ 200 |
| 9 | `/api/v1/security/patients` | ✅ 200 |
| 10 | `/api/v1/cds/order-check` | ✅ 200 |
| 11 | `/api/v1/mobile/vitals-chart` | ✅ 200 |
| 12 | `/api/v1/system/params` | ✅ 200 |
| 13 | `/api/v1/hospital/departments-detail` | ✅ 200 |
| 14 | `/api/v1/research/studies` | ✅ 200 |
| 15 | `/api/v1/emr/version-diff` | ✅ 200 |
| 16 | `/api/v1/emr/quality-rules` | ✅ 200 |
| 17 | `/api/v1/cssd/requests` | ✅ 200 |
| 18 | `/api/v1/auth/permissions` | ✅ 200 |
| 19 | `/api/v1/tcm/constitution` | ✅ 200 |
| 20 | `/api/v1/emr/lock` | ✅ 200 |
| 21 | `/api/v1/pathology/reports` | ✅ 200 |
| 22 | `/api/v1/fhir/Coverage` | ✅ 200 |
| 23 | `/api/v1/security/vulnerability` | ✅ 200 |
| 24 | `/api/v1/dental/visits` | ✅ 200 |
| 25 | `/api/v1/fhir/practitioner` | ✅ 200 |
| 26 | `/api/v1/outpatient/schedule` | ✅ 200 |
| 27 | `/api/v1/emr/sign` | ✅ 200 |
| 28 | `/api/v1/icu/patients` | ✅ 200 |
| 29 | `/api/v1/emr/watermark` | ✅ 200 |
| 30 | `/api/v1/cssd/sterilization` | ✅ 200 |

---

## 三、性能压测结果

**压测目标**：`GET /api/v1/dashboard/stats`
**压测模型**：50 并发 × 4 次 = 200 样本，DEMO_MODE 内存 mock

| 指标 | 数值 |
|---|---|
| **QPS** | **587.9 req/s** |
| **P99 延迟** | **75.1 ms**（P50 11.4ms / P95 36.7ms / 平均 13.5ms） |
| **成功率** | **100%**（200/200，0 失败） |
| 总耗时 | 0.34 s |
| 最小/最大延迟 | 1.3 / 75.2 ms |

---

## 四、tsc 双零验证

| 命令 | 结果 |
|---|---|
| `bun x tsc --noEmit` | ✅ exit 0，零错误零输出 |

---

## 五、总结

| 项目 | 结果 |
|---|---|
| 总端点数 | 397 |
| 抽样验证通过率 | 30/30 = 100% |
| 压测 QPS | 587.9 req/s |
| 压测 P99 | 75.1 ms |
| 压测成功率 | 100% |
| tsc 双零 | ✅ 通过 |

**BFF 运行中**，DEMO_MODE=1，未执行任何 git 写操作。
