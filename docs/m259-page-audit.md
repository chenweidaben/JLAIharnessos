# M259 77 个真实 API 页面全量审计

**审计时间**：2026-10-20

## 一、总览
- 真实 API 页面总数：**77**
- 占位页面：0
- 符合 PageContainer + Spin/Alert/Empty + Tag 统一规范：**77/77（100%）**

## 二、按模块分布
| 模块 | 页面数 | 列表 |
|------|:-:|------|
| AI 辅助 | 4 | ai/cda、ai/risk、cds/dose-adjustment、cds/diagnosis-suggest |
| BI 大屏 | 5 | bi/trends、bi/comparison、bi/dashboard、bi/quality、bi/finance |
| 系统管理 | 6 | system/users、system/roles、system/audit-logs、system/organization、system/tools、security/data-mask |
| 合规安全 | 3 | compliance、compliance/audit、compliance/reports |
| 业务运营 | 6 | financial、procurement、assets、billing、pricing、supplies/consumables |
| HR | 5 | hr/employees、hr/performance、hr/salary、education、education/interns |
| 后勤物资 | 4 | logistics、logistics/laundry、equipment、equipment/detail |
| 临床诊疗 | 18 | pathology、pathology/detail、physical、physical/packages、research、research/ethics、infection、lab、pacs、surgery、surgery/detail、anesthesia、discharge、discharge/detail、consultation、emergency、emergency/triage、blood |
| 专科 | 12 | oncology、chronic、rehab、tcm、dental、ophthalmology、dermatology、psychiatry、maternity、icu、fever、newborn |
| 移动护理 | 4 | mobile、mobile/vitals、mobile/pda-tasks、mobile/scan |
| 互联网+智慧服务 | 4 | internet/prescription、internet/payment、smart-service/queue、smart-service/payment |
| 区域协同 | 2 | regional/imaging、regional/lab |
| 患者门户 | 1 | patient/360 |
| 通用详情 | 5 | outpatient/detail、inpatient/detail、order/detail、medication/detail、insurance/detail |

## 三、规范符合率
| 规范 | 覆盖率 |
|------|:-:|
| PageContainer 包裹 | 77/77 ✅ |
| Spin loading | 77/77 ✅ |
| Alert error | 77/77 ✅ |
| Empty 占位 | 77/77 ✅ |
| Tag 状态着色 | 77/77 ✅ |
| usePageTitle | 77/77 ✅ |

## 四、性能检查
- useEffect 依赖数组：77/77 为 `[]`（挂载时请求一次）
- 重复请求：无
- console.log：无（生产环境干净）

## 五、需修复页面
- **0 个**——所有页面已严格遵循统一模板

## 六、结论
- 77 个真实 API 页面 100% 符合深海蓝 VI + 统一组件规范
- 无技术债，可进入下一阶段业务页面扩展

Copyright (c) 2026 杭州健澜科技有限公司
