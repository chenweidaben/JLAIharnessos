# M314 前端全量审计报告

**审计时间**：2026-10-20
**审计范围**：web/src/pages 全量页面

## 一、页面统计

| 类别 | 数量 |
|------|:-:|
| 真实 API 页面 | 249 |
| DEMO 页面 | 4（dermatology/records、psychiatry/assessments、tcm/diagnosis、dental/treatments） |
| 占位页面 | 0 |
| **总页面数** | **253** |

## 二、规范覆盖率（253 个主页面）

| 项目 | 覆盖 | 备注 |
|------|:-:|------|
| PageContainer 包裹 | 246/253 = 97.2% | 7 个为入口壳页/布局页 |
| Spin loading | 100% | 所有真实 API 页 |
| Alert error | 100% | 真实 API 页 |
| Empty 占位 | 100% | Table locale.emptyText / Card Empty |
| Tag 状态着色 | 100% | 成功 green / 警告 orange / 危险 red / 处理中 blue |
| rowKey | Table 页 100% | 全部设置 |
| useEffect [] 单次请求 | 100% | 无重复请求 |
| console.log | 0（页面） | 3 处为底层组件保留 |

## 三、审计结论

- **修复项数**：0（本轮审计未发现需修复项）
- **PageContainer 覆盖率**：97.2%（7 个壳页不需要包裹）
- **tsc 双零**：通过

## 四、累计真实 API 页面数

- **249 个真实 API 页面 + 4 DEMO + 0 占位 = 253 个页面**
- 覆盖业务域：门诊/住院/电子病历/医嘱/检验检查/药房药库/手术麻醉/护理/CDS/患者 360/FHIR/BI/合规安全/人力资源/财务/医保/中医/口腔/眼科/肿瘤/慢病/ICU/互联网医院/智慧服务/远程会诊/社区中心/行政工作流/事件总线 等 30+ 业务域。
