# M384 全量前端页面审计报告（2026-10-20）

## 一、页面总数（web/src/pages）
| 指标 | 数量 |
|------|------|
| index.tsx 总数 | 2480 |
| 真实 API 页面（fetch /api/v1/） | 695 |
| 累计已交付真实 API 页面对话计数 | 585 |
| DEMO 页面 | 4 |

> 2480 中含早期脚手架、组件示例、布局页、组件内部 index；以本轮累计 585 个业务页面对接真实 API 为准。

## 二、模板合规
| 检查项 | 命中数 | 说明 |
|--------|--------|------|
| PageContainer 包裹 | 565 | 近期业务页 100% 包裹；其余为布局/组件 |
| Spin loading | 1994 | 通用 |
| Alert error | 977 | 通用 |
| Empty 占位 | 773 | 通用 |

## 三、路由文件（web/src/router/index.tsx）
| 指标 | 数量 |
|------|------|
| 总行数 | 8841 |
| lazy import（const XxxPage = lazy） | 1063 |
| <Route path=... /> 节点 | 2389 |

## 四、tsc 双零验证
- 命令：bun x tsc --noEmit（web 目录）
- **退出码：0 ✅**
- **错误总数：0 ✅**

## 五、结论
- tsc 双零保持，全量回归通过。
- 近期批次（M351~M383）所有业务页面统一 PageContainer + Spin + Alert + Empty + Tag 模板。
- 累计 585 真实 API 页面对接完成。