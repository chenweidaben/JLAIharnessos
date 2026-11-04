# P1-3 手术麻醉闭环 简报（22:10 轮）

## commit
- e75ba66e feat(surgery): 申请→排班→术中→PACU
- 93e7f05d docs: 台账回写

## 新增路由
POST /api/v1/surgery-workflow/requests（surgeon 申请）
POST .../requests/:reqId/schedule（admin 排班，手术间互斥）
POST .../requests/:reqId/transition（状态机流转）
POST .../requests/:reqId/anesthesia-record（anesthetist）
POST .../requests/:reqId/pacu-note（nurse，aldrete 0~10）
GET  .../requests?visitId=

## 状态机
draft→scheduled→in_or→in_progress→in_pacu→recovered→ward_returned；非法跃迁 409

## 门禁（我本人复跑）
- 单测：16 pass / 0 fail / 20 expect
- E2E：10 pass / 0 fail / 23 expect（重启 BFF 清库存后独立复跑确认）
- 双 tsc 双零
- 品牌 16 词 0 命中

## 权限
surgeon 申请 OK；anesthetist 申请 403；surgeon 排班 403（admin）；nurse 麻醉记录 403；surgeon PACU 403

## 互斥/校验
同 orRoom 时段重叠 409；plannedDurationMin 10→400；aldrete=11→400；行级错配 403

## BFF pid
8456 → 35284 → 35576 → 39400 → 38228（多次重启加载路由+清库存+本人复跑）；六端点全 200；5173 未动

## 未覆盖
术中监护多时间点曲线、术前讨论/麻醉评估单、手术文书 PDF、术前核查单联动