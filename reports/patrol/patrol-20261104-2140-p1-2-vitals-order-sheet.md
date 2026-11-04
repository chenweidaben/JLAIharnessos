# P1-2 体温单/医嘱单 简报（21:40 轮）

## commit
- a92fb36d feat(nursing): 体温单独立护理文书 + 医嘱单续打/补打/重打
- 1f832ea5 docs: 台账回写

## 新增路由
POST /api/v1/nursing/vitals-sheet/entries（护士录体温/脉搏/呼吸/血压/SpO2/体重/大便）
GET  /api/v1/nursing/vitals-sheet/curve?visitId=&date=（24h 4h 对齐曲线）
POST /api/v1/clinical/order-sheet/print（continuation/reissue/reprint）
GET  /api/v1/clinical/order-sheet/prints?visitId=（打印历史）

## 门禁（我本人复跑）
- 单测：15 pass / 0 fail / 27 expect
- E2E：10 pass / 0 fail / 24 expect（连续两次 + 独立复跑）
- 双 tsc 双零
- 品牌 16 词 0 命中

## 权限
护士录体温 OK / 医生录体温 403；医生看曲线 200；医嘱单打印 doctor 申请 + nurse 执行；行级错配 403

## 状态机/校验
体温 35~42℃/脉搏 40~160/呼吸 8~40/SBP 60~220/DBP 30~130 硬校验越界 400；reprint 同模式重复 printCount 累加（200 非 409）；非法 printMode 400；reissue range(from>to) 400

## BFF pid
32616 → 42124 → 8456（二次重启清内存验证 E2E 可重跑）；六端点全 200；5173 未动

## 未覆盖
体温曲线前端绘制/网格、医嘱单 PDF 排版与长期/临时分单、与 P0-3 PDA 体征联动