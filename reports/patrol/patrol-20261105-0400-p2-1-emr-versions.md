# P2-1 病历版本管理 简报（04:00 轮）

## commit
- d1c762e6 feat(emr-versions): 不可变历史+diff+终稿锁定+审批解锁
- d52200e9 docs: 台账回写
- f09d34cf fix(test): 测试字段对齐 NoteContent 类型（本人复跑根 tsc 抓 3 处 TS2353）

## 新增路由
POST /api/v1/emr-versions/notes（医生建 v1）
POST .../:noteId/revise（医生修订递增版本）
GET  .../notes/:noteId/versions（版本列表）
GET  .../notes/:noteId/versions/:v（单版只读）
GET  .../notes/:noteId/diff?from&to（版本对比）
POST .../:noteId/finalize（attending 终稿锁定）
POST .../:noteId/unlock-for-edit（主任审批解锁，reason 必填）
POST .../:noteId/re-lock（解锁后再锁定）

## 门禁（本人复跑）
- **根 tsc：exit 0 / 0 字节**（首跑子代理报全绿，本人复跑抓到 3 处测试 TS2353，已修 f09d34cf）
- web tsc：exit 0 / 0 字节
- 单测：13 pass / 0 fail / 23 expect
- E2E：4 pass / 0 fail / 20 expect（重启 BFF 清库存后独立复跑）
- 品牌 16 词 0 命中

## 权限/状态机
resident 建 v1/revise OK；resident finalize 403；attending finalize OK；nurse 不可写 403
finalized 后 revise 409；unlock 无 reason 400；unlock 后 revise 200；re-lock 幂等 200

## diff
结构化字段 chiefComplaint/presentIllness/physicalExam/assessment/plan 字段级 before/after；缺省字段按 null 处理

## BFF pid
多轮重启后本人复跑重启；六端点全 200；5173 未动

## 未覆盖
SM2 电子签名（挂 P0-6）、全文语义 diff、版本对比 UI、与 M542 medical-records/:id/versions GET 桩合并