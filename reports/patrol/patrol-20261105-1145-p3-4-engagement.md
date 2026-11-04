# P3-4 报告推送+满意度闭环工单 简报（11:45 轮）

## commit
- c76c8a71 feat(engagement): 报告 4 态+工单 4 态+评论
- c0a9d3c0 docs: 台账回写

## 新增路由
POST /api/v1/engagement/reports
GET  /api/v1/engagement/reports?patientId
POST .../reports/:id/read
POST /api/v1/engagement/tickets
GET  /api/v1/engagement/tickets?patientId
POST .../tickets/:id/comment
POST .../tickets/:id/status
POST /api/v1/engagement/_seed

## 状态机
报告：issued→published→pushed→read（isAbnormal 加推 sms）
工单：open→investigating→resolved→closed（非法跃迁 409，关单必填 comment）

## 门禁（本人复跑）
- 根 tsc：exit 0 / 0 字节
- web tsc：exit 0 / 0 字节
- 单测：16 pass / 0 fail / 26 expect
- E2E：12 pass / 0 fail / 19 expect（重启 BFF 清库存后独立复跑）
- 品牌 17 词 Ordinal 0 命中

## 关键校验
patient 查别人报告 403；patient 改工单状态 403；admin open→closed 非法跃迁 409；关单无 comment 400；closed 工单 comment 409；read 幂等；isAbnormal 加推 sms

## BFF pid
多轮重启后本人复跑重启；五端点全 200；Vite 5173 未启动（按约定勿动）

## P3 系列收官
P3-1 患者门户 / P3-2 智能预问诊+导诊 / P3-3 号源池+自助预约 / P3-4 报告推送+满意度工单

## 未覆盖
真实 SMS 网关、推送到达回执、工单 SLA 计时、工单分配科室坐席、满意度趋势看板