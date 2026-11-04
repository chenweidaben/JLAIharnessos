# P3-3 号源池+患者自助预约挂号 简报（10:40 轮）

## commit
- 8a2f7c87 feat(scheduling): Slot/Booking + 10 时段 + 9 科室
- 9850293b docs: 台账回写

## 新增路由
GET /api/v1/self-scheduling/slots?departmentId&date&slotType
POST /api/v1/self-scheduling/slots/_seed（仅 DEMO_MODE）
POST /api/v1/self-scheduling/bookings
GET  /api/v1/self-scheduling/bookings?patientId
POST /api/v1/self-scheduling/bookings/:id/cancel
GET /api/v1/self-scheduling/departments

## 数据
10 时段（上午 6 + 下午 4）；9 科室；slotType outpatient/checkup（CT/MRI/US/ECG）

## 门禁（本人复跑）
- 根 tsc：exit 0 / 0 字节
- web tsc：exit 0 / 0 字节
- 单测：14 pass / 0 fail / 23 expect
- E2E：10 pass / 0 fail / 18 expect（重启 BFF 清库存后独立复跑）
- 品牌 17 词 Ordinal 0 命中

## 关键校验
doctor 代预约 403；patient 看别人 403；号源满 409（capacity=1 第一次成功第二次 409）；重复预约 409；取消释放 booked-- + closed→re-open；重复取消 409；slot 不存在 404

## BFF pid
多轮重启后本人复跑重启；六端点全 200；5173 未动

## 未覆盖
号源放号规则（每日 0 点放新号）、退号手续费、爽约黑名单、检查号扩到 PET/胃肠镜、与真实 HIS 号源同步