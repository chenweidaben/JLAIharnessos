# P0-5 押金结算深化 简报（19:35 轮）

## commit
- 9f069288 feat(inpatient): P0-5 补中途结算与一日清单推送
- 291f434f docs: 台账回写

## 新增路由
POST /api/v1/inpatient/deposit-settle/mid-settlements（中途结算 type=mid）
POST /api/v1/inpatient/deposit-settle/daily-statements/push（一日清单推送，同日幂等）

## 门禁（我本人复跑）
- 单测：11 pass / 0 fail / 20 expect
- E2E：9 pass / 0 fail / 21 expect（连续两次 + 独立复跑）
- 双 tsc 双零
- 品牌 16 词 0 命中

## 权限
cashier/finance/admin 可结算可推送；doctor/nurse → 403 code=40300

## 状态机/幂等
已出院再中途结算 409；idempotencyKey 重复返原单；同日重复推送幂等；行级 patientId 错配 403

## BFF pid
49480 → 47052；六端点全 200；5173 未动

## 未覆盖
医保实时结算对接、一日清单 PDF 导出/患者端推送