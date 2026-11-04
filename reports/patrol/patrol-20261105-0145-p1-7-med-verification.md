# P1-7 医嘱执行机读核对 简报（01:45 轮）

## commit
- e25f4734 feat(med-verification): 腕带/PDA 6 级评级
- b9946c2e docs: 台账回写

## 新增路由
POST /api/v1/medication-verification/orders（doctor 创建医嘱 L1~L6）
POST .../:orderNo/scan-wristband（nurse 扫腕带，不匹配 403）
POST .../:orderNo/scan-barcode（扫药品条码，不符 422）
POST .../:orderNo/execute（执行，未扫腕带 409/重复 409）
POST .../:orderNo/reject|pause|resume|discontinue
GET  .../orders?visitId=

## 6 级评级矩阵
L1 routine / L2 caution / L3 high-alert（双人）/ L4 look-alike-sound-alike（双人）/ L5 emergency-stat（双人+停药主任审批）/ L6 investigational（双人+停药主任审批）

## 门禁（我本人复跑）
- 单测：17 pass / 0 fail / 29 expect
- E2E：5 pass / 0 fail / 20 expect（重启 BFF 清库存后独立复跑）
- 双 tsc 双零
- 品牌 16 词 0 命中

## 权限
doctor 创建 OK；nurse 创建 403；nurse 执行 OK；doctor 执行 403；跨角色 403

## 关键校验
腕带不匹配 403；药品条码不符 422 code=42200；L3+ 缺 witness 400；witness==nurse 400；未扫腕带就执行 409；重复执行 409；L5 停药无 approver 400

## BFF pid
多轮重启后本人复跑重启；六端点全 200；5173 未动

## 未覆盖
真实 PDA/腕带/RFID 硬件、电子签名（挂 P0-6 SM2）、CDSS 高警实时拦截、听似看似药库自动匹配