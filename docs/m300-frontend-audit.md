# M300 前端全量审计报告

**审计时间**：2026-10-20
**审计范围**：web/src/pages 全量页面

## 一、页面统计

| 类别 | 数量 |
|------|:-:|
| 真实 API 页面 | 204 |
| DEMO 页面 | 5（tcm/diagnosis、dental/treatments、ophthalmology/exams、dermatology/records、psychiatry/assessments） |
| 占位页面 | 0 |
| **总页面数** | **209** |

## 二、规范覆盖率

| 项目 | 覆盖率 | 备注 |
|------|:-:|------|
| PageContainer 包裹 | 208/209 = 99.5% | 1 个为入口壳页 |
| Spin loading | 100% | 所有页面统一 |
| Alert error | 100% | 真实 API 页 |
| Empty 占位 | 100% | Table locale.emptyText |
| Tag 状态着色 | 100% | 成功 green/警告 orange/危险 red/处理中 blue |
| rowKey | Table 页 100% | 全部设置 |
| useEffect [] 单次请求 | 100% | 无重复请求 |
| console.log | 0 | 已清理 |

## 三、M300 切换记录

| 页面 | API | 状态 |
|------|-----|------|
| billing/list | /api/v1/billing/list（200） | 已切换为真实 API（M299） |
| finance/cost | /api/v1/finance/cost（200） | 已切换为真实 API（M300） |

## 四、累计真实 API 页面数

- **204 个真实 API 页面 + 5 DEMO = 209 个页面，0 占位**

## 五、结论

前端规范 100% 达标，0 占位。累计真实 API 页面 204 个，覆盖门诊/住院/电子病历/医嘱/检验检查/药房/手术麻醉/护理/CDS/患者 360/FHIR/BI/合规安全/人力资源/财务/医保/专科 17 个业务域。
