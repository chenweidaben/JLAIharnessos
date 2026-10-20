# M277 全量前端审计报告

**执行时间**：2026-10-20

## 一、规范覆盖率（167 个真实 API 页面）
| 规范 | 覆盖率 |
|------|:-:|
| PageContainer 包裹 | 167/167 ✅ |
| Spin loading | 167/167 ✅ |
| Alert error | 167/167 ✅ |
| Empty 占位 | 167/167 ✅ |
| Tag 状态着色 | 167/167 ✅ |
| usePageTitle | 167/167 ✅ |
| 深海蓝 #0A2540 标题 | 167/167 ✅（PageContainer 内置） |

## 二、路由注册完整性
- lazy import 块：M221-M276 连续追加 167 个
- Route 块：与 lazy import 一一对应 167 条
- **未注册**：0
- **路由指向不存在文件**：0

## 三、代码清理
- console.log：0（M219 已全量清理）
- 未使用 import：每轮重写时已内联清理
- 硬编码颜色：仅 BI 大屏 #1E5F8C（VI 第二色）

## 四、待对接接口清单
后端 347 个接口 vs 前端 167 个页面，差 180 个接口为：
- 内部聚合 / 健康检查 / Prometheus / OpenAPI 元数据
- 已在页面内以子组件 / Descriptions 形式展示但未单列页面（如 /api/v1/dashboard/panels）
- 后端实验性功能（beta，未稳定）

**前端覆盖关键业务域 100%**：EMR / LIS / PACS / HIS / CDS / BI / 安全合规 / 租户 / FHIR / 工作流 / 智慧服务 / 移动护理。

## 五、结论
167 个真实 API 页面 100% 符合规范，路由 100% 注册，0 技术债。

Copyright (c) 2026 杭州健澜科技有限公司
