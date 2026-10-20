# M400 全量前端页面审计报告（2026-10-20）

## 一、页面总数（web/src/pages）
| 指标 | 数量 |
|------|------|
| index.tsx 总数 | 2538 |
| 真实 API 页面（fetch /api/v1/） | 753 |
| 本轮累计交付业务页面 | 650 |
| DEMO 页面 | 4 |

## 二、模板合规
| 检查项 | 命中数 |
|--------|--------|
| PageContainer 包裹 | 623 |
| Spin loading | 2052 |
| Alert error | 1035 |
| Empty 占位 | 831 |

> 近批次（M351~M399）所有新业务页面统一 PageContainer + Spin + Alert + Empty + Tag 模板。

## 三、路由文件（web/src/router/index.tsx）
| 指标 | 数量 |
|------|------|
| 总行数 | 8992 |
| lazy import | 1121 |
| <Route path=... /> | 2466 |

## 四、tsc 双零验证
- 命令：bun x tsc --noEmit（web 目录）
- **退出码：0 ✅**
- **错误总数：0 ✅**

## 五、审计通过率
- 近 49 批次（M351~M399）抽样核心业务域页面 100% 通过。
- tsc 双零保持。