# 11:23 轮主线巡检——P3-3 号源池+患者自助预约挂号独立复测收口

时间：2026-11-04 23:15（Asia/Shanghai）
分支：consult-agent-m86
上一轮三端对齐基线：`63758672`（10:23 轮 P3-2 收口）

## 本轮结论

P3-3 号源池 + 患者自助预约挂号已由组织智能体 `o_000Rfj7NkAk` 交付（commits `8a2f7c87` feat + `9850293b` docs 台账 + `aeac621d` docs 简报）。主线独立复测全绿，本轮收口。

## 主线实测门禁

| 项 | 结果 |
|---|---|
| 根 `node node_modules/typescript/bin/tsc --noEmit` | exit 0 / 0B |
| web `bun x tsc --noEmit` | exit 0 / 0B |
| `bun test ./tests/unit/selfScheduling.test.ts ./tests/integration/selfScheduling-e2e.test.ts` | 24 pass / 0 fail / 41 expect（14 unit + 10 e2e） |
| 品牌硬禁词 17 词 Ordinal 扫描（src+web/src） | 9,783 文件 0 命中 |
| BFF 五健康端点 | 全 200 |
| Vite 5173 首页 | 200（pid 11528 全程未重启） |
| 工作区 tracked 改动 | 无 |

## 假红处置记录（重要经验复现）

首跑 e2e 2 fail：
- listSlots 返回 4 而期望 2（上一轮 seed 内存残留）
- CT 检查号第二人预约期望 409 实际 40900 已 closed（同一 slot 被前序 seed 占满）

按 P1-3 实测经验判定为 BFF 内存库存残留假红，重启 BFF（杀 8080 pid → DEMO_MODE=1 重启）后复跑 24 pass/0 fail/41 expect，全绿。未改任何测试断言或源码。

## P3-3 交付物

- Slot/Booking 两实体：10 个半小时时段（上午 6 + 下午 4）、9 科室、2 类 slotType（outpatient/checkup）。
- 路由：查号源、患者预约、我的预约、取消释放号源、科室列表。
- 关键校验：doctor 代预约 403、patient 看别人 403、号源满 409、重复预约 409、取消后 booked-- 且 closed 自动 re-open、重复取消 409、slot 不存在 404。

## P3 智慧服务三级进度

- P3-1 患者互联网+服务门户
- P3-2 智能预问诊 + 智慧导诊
- P3-3 号源池 + 患者自助预约挂号

## 未覆盖（台账已标注）

号源放号规则（每日 0 点放新号）、退号手续费、爽约黑名单、检查号扩到 PET/胃肠镜、与真实 HIS 号源同步。
