# P1-4 输血闭环 简报（22:40 轮）

## commit
- 83f1b3cb feat(transfusion): 申请→鉴定→配血→发血→双人核对→输注
- 69863f41 docs: 台账回写

## 新增路由
POST /api/v1/transfusion-workflow/requests（doctor 申请）
POST .../requests/:reqId/type（blood_bank_tech 血型鉴定）
POST .../requests/:reqId/crossmatch（交叉配血，不合 409）
POST .../requests/:reqId/issue（发血，同袋重复 409）
POST .../requests/:reqId/bedside-check（nurse 双人核对，双工号）
POST .../requests/:reqId/transfuse（开始输注）
POST .../requests/:reqId/adverse-reaction（不良反应 severity 1~4）
GET  .../requests?visitId=

## 状态机
application→typed→crossmatched→issued→bedside_checked→transfusing→completed；非法跃迁 409

## 门禁（我本人复跑）
- 单测：15 pass / 0 fail / 20 expect
- E2E：7 pass / 0 fail / 21 expect（重启 BFF 清库存后独立复跑）
- 双 tsc 双零
- 品牌 16 词 0 命中

## 权限
doctor 申请 OK；nurse 申请 403；doctor 输注/核对 403；blood_bank_tech 配血发血 OK

## 关键校验
配血不合 409；同血袋重复发血 409；nurseId==witnessNurseId 400；matched=false 409；units=99 400；severity=5 400；行级错配 403

## BFF pid
47556 → 新（本人复跑重启）；六端点全 200；5173 未动

## 未覆盖
血袋库存扣减联动、不良反应上报院感闭环、输血同意书电子签（挂 P0-6 SM2）