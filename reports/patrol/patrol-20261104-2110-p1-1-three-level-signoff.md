# P1-1 三级检诊工作流 简报（21:10 轮）

## commit
- 17dd063d feat(rounds): resident/attending/chief 三级签审
- c1da69ed docs: 台账回写

## 现状判定
既有 inpatientCare /inpatient/rounds 是 PG 二级模型（draft→signed→countersign），不是三级。新建独立内存模块。

## 新增路由
POST /api/v1/inpatient/ward-round-signoff/notes（住院医写病程 draft）
POST .../notes/:noteId/review（主治 approve/reject+comment）
POST .../notes/:noteId/chief-sign（主任终签）
GET  .../notes?visitId=（列表）
GET  .../notes/:noteId/trail（签审意见时间线）

## 门禁（我本人复跑）
- 单测：15 pass / 0 fail / 27 expect
- E2E：8 pass / 0 fail / 19 expect（连续两次 + 独立复跑）
- 双 tsc 双零
- 品牌 16 词 0 命中

## 权限
resident 写 OK / 审签 403；attending 审 OK / 终签 403；chief 终签 OK；行级错配 403

## 状态机/越级留痕
draft → chief_sign → archived；reject 回 draft；archived 不可改 409；越级（主治未审主任直签）escalated=true bypassedLevel=attending

## BFF pid
19752 → 32616；六端点全 200；5173 未动

## 未覆盖
病程版本对比、与既有 PG 二级 rounds 合并、与 P0-6 电子签名挂接终签