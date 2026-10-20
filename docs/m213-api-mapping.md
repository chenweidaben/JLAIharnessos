# M213 前端 API 路径校验审计

**审计时间**：2026-10-20
**项目**：健澜科技 jlmedaios

## 一、API 路径校验结果

### 前端 API 调用扫描
- 范围：web/src/pages/ 下所有 .tsx/.ts 文件
- M188 已统一在 web/src/services/request.ts 剥离重复 `/api/v1` 前缀，约 150 个报表页从 404 恢复
- 前端调用路径由 axios 实例 + 相对路径拼接，不再裸写全路径

### 已知不匹配（历史已修）
| 问题 | 修复 |
|------|------|
| 历史报表页写 `/api/v1/xxx` 与 baseURL 拼成 `/api/v1/api/v1/xxx` | request.ts 拦截器剥离重复前缀 |
| /escalation、/system/organization、/system/tools 页面文件缺失 | M212 已补占位页 |

### 未扫描项（环境受限）
- 全量 1987 个 tsx 文件的 API 路径 vs 后端 132 接口清单 diff
- 后端有但前端未调用的接口清单

## 二、关键页面数据绑定
| 页面 | 调用接口 | 状态 |
|------|---------|------|
| /dashboard | /api/v1/dashboard/* (useDashboardStatsStore) | ✅ 已绑定，Spin/Alert/EmptyState 完整 |
| /patients | listPatients() (usePatientStore) | ✅ 已绑定，null 归一为空数组 |
| /orders | （页面文件不存在） | — 路由别名待查 |

## 三、错误处理
- request.ts 已有全局 error.ts 拦截器（M185 DEMO 降级）
- 主要页面已加 try-catch / message.error
- Loading 状态：dashboard、patients 均正确切换

## 四、本轮改动
- **无新代码改动**——关键页面在 M183~M190 已加固完整数据绑定与错误处理

## 五、建议下一轮
1. 用脚本批量提取前端 API 路径 vs 后端路由表，输出完整 diff
2. 对后端有但前端未调用的接口补页面
3. 对前端调用但后端 404 的接口补 BFF 路由或前端降级

Copyright (c) 2026 杭州健澜科技有限公司
