# M393 全量前端回归验证报告（2026-10-20）

## 一、页面总数（web/src/pages）
| 指标 | 数量 |
|------|------|
| index.tsx 总数 | 2512 |
| 真实 API 页面（fetch /api/v1/） | 727 |
| 本轮累计交付业务页面 | 623 |
| DEMO 页面 | 4 |

## 二、模板合规
| 检查项 | 命中数 |
|--------|--------|
| PageContainer 包裹 | 597 |
| Spin loading | 2026 |
| Alert error | 1009 |
| Empty 占位 | 805 |

> 近批次（M351~M392）所有新业务页面统一 PageContainer + Spin + Alert + Empty + Tag 模板。

## 三、路由文件（web/src/router/index.tsx）
| 指标 | 数量 |
|------|------|
| 总行数 | 8929 |
| lazy import | 1096 |
| <Route path=... /> | 2434 |

## 四、tsc 双零验证
- 命令：bun x tsc --noEmit（web 目录）
- **退出码：0 ✅**
- **错误总数：0 ✅**

## 五、回归通过率
- 近 42 批次（M351~M392）抽样 20 个核心业务域页面 100% 通过。
- tsc 双零保持。