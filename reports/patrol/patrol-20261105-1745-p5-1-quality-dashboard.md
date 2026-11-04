# P5-1 医疗质量管理指标闭环 简报（17:45 轮）

## commit
- c680deb2 feat(quality): 9 项指标派生 + overview/by-doctor/trend 三视图
- 9bbc3336 docs: 台账回写

## 新增路由
GET /api/v1/quality/dashboard/overview
GET /api/v1/quality/dashboard/by-doctor
GET /api/v1/quality/dashboard/trend?metric=
POST /api/v1/quality/dashboard/_seed（DEMO）

## 9 项指标
cdsHardStopRate / cdsOverrideRate / fallRatePer1000 / pressureUlcerRatePer1000 / orderExecutionMedianMin / criticalValueClosedLoopRate / criticalValueAvgAckMin / patientSatisfactionAvg / lowScoreTicketClosedRate / chiefRoundCompletionRate

## 门禁（本人复跑）
- 根 tsc：exit 0 / 0 字节
- web tsc：exit 0 / 0 字节
- 单测：13 pass / 0 fail / 24 expect
- E2E：8 pass / 0 fail / 17 expect（重启 BFF 清库存后独立复跑）
- 品牌 17 词 Ordinal 0 命中

## 关键实测
admin overview 9 字段全在，指标非零；科室过滤生效；by-doctor rows 非空；trend points 非空；metric 白名单外 400；doctor 跨科室 403；doctor by-doctor rows 全是自己

## BFF pid
多轮重启后本人复跑重启；六端点全 200；5173 已活

## 未覆盖
接入真实 P2-2/P2-4/P0-2 事件流、同比/环比、指标阈值告警自动建工单、PDF/Excel 导出、院/科/组三级下钻

## 注意
工作树有非本次切片改动 web/src/router/index.tsx（其他来源删除 lazy 注册），未触碰