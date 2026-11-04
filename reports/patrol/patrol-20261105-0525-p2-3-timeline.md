# P2-3 患者时间线 简报（05:25 轮）

## commit
- 2fd8c504 feat(timeline): 多源事件倒序聚合
- 6dc0c211 docs: 台账回写

## 新增路由
GET /api/v1/patient-timeline/:patientId/events?type&from&to&limit&offset
GET /api/v1/patient-timeline/:patientId/summary
POST /api/v1/patient-timeline/_seed（仅 DEMO_MODE）

## 事件源（7 类）
lab / imaging / medication / surgery / nursing / cds / encounter

## 门禁（本人复跑）
- 根 tsc：exit 0 / 0 字节
- web tsc：exit 0 / 0 字节
- 单测：12 pass / 0 fail / 26 expect
- E2E：11 pass / 0 fail / 23 expect（重启 BFF 清库存后独立复跑）
- 品牌 16 词 0 命中

## 关键校验
limit 默认 50 最大 200（>200 400）；type 白名单（未知 400）；from/to ISO 校验（非法 400）；patient 看自己 200 看别人 403；倒序 time 降序；summary byType 计数 + timeRange

## BFF pid
多轮重启后本人复跑重启；六端点全 200；5173 未动

## 未覆盖
跨模块真实埋点（CDS acknowledge 等尚未接 recordEvent）、UI 分组卡片、真实 PG 持久化、患者端推送