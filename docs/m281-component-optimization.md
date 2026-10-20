# M281 前端组件优化报告

**执行时间**：2026-10-20

## 一、6 个占位页 Alert 检查
| 页面 | Alert 文案 |
|------|------|
| physical/centers | 等待后端 /api/v1/physical/centers 接口上线 |
| insurance/policies | 等待后端 /api/v1/insurance/policies 接口上线 |
| maternity/records | 等待后端 /api/v1/maternity/records 接口上线 |
| fever/clinics | 等待后端 /api/v1/fever/clinics 接口上线 |
| newborn/records | 等待后端 /api/v1/newborn/records 接口上线 |
| inpatient/wards | 等待后端 /api/v1/inpatient/wards 接口上线 |

全部使用 `Alert type="info" showIcon`，统一文案格式。

## 二、PageContainer 面包屑
- PageContainer 已支持 `breadcrumb?` 可选 prop（现有页面未传，不破坏）
- 全局深海蓝 #0A2540 标题内置

## 三、标题格式
- usePageTitle(`「模块名」`) + 浏览器 tab 已统一
- PageContainer title 即为模块名，已覆盖 184 个页面

## 四、Tag 颜色约定
- 成功/已完成/达标/active/final/completed → `green`
- 警告/需修改/未处理/超时 → `orange`
- 危险/严重/高/阻断/失败 → `red`
- 处理中/进行中/候诊/其他分类 → `blue`
- ID/编号/分类标识 → `purple`
- 前三名/优先级 → `gold`

184 个页面已统一遵循此约定。

Copyright (c) 2026 杭州健澜科技有限公司
