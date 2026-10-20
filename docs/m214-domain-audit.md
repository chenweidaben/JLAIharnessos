# M214 护理/医嘱/药房/病历域页面数据展示审计

**审计时间**：2026-10-20

## 一、护理域
| 页面 | 状态 | 说明 |
|------|------|------|
| nursing/BedMap/index.tsx | ✅ 有数据 | M197 已升级为 Drawer + 24h 体温曲线 SVG + 今日医嘱 5 条 |
| nursing/NqiDashboard/index.tsx | ✅ 有数据 | 4 指标卡 + ECharts 折线图，从 useNursingNqiStore 拉取 |
| nursing/Handoff/ | ✅ 有数据 | M199 已补 3 条交班本 demo |
| nursing/report-v2 / report-v3 | ✅ 有数据 | 报表页 |

## 二、医嘱域
| 页面 | 状态 | 说明 |
|------|------|------|
| medAdmin/index.tsx | ✅ 有数据 | 三查七对工作站 + M197 扫码 Modal + 今日待执行医嘱 5 条 |

## 三、药房域
| 页面 | 状态 | 说明 |
|------|------|------|
| pharmacy/index.tsx | ✅ 有数据 | M197 已补用药提醒 5 条（Tab 页签） |
| pharmacy/DispenseModal | ✅ 有数据 | M197 已补 antd Steps（核对人 A/B） |
| pharmacy/aiReview / InventoryAlert / Lifecycle | 子模块 | 独立页 |

## 四、病历域
| 页面 | 状态 | 说明 |
|------|------|------|
| medical-record/index.tsx | ✅ 有数据 | M208 已补 5 条病案列表 Table |
| medical-record-detail/index.tsx | ✅ 有数据 | M208 已补 5 条检查项 Table |

## 结论
本轮**无需新增 Table**——护理/医嘱/药房/病历域的核心页面在 M197/M199/M208 期间已批量补全 demo 数据。

## 交付物
本审计报告即 docs/m214-domain-audit.md。

Copyright (c) 2026 杭州健澜科技有限公司
