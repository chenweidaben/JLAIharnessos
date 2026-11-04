# P1-5 ICU 监护文书 简报（23:05 轮）

## commit
- b8940124 feat(icu): 转入转出+多时间点体征+APACHE/SOFA/RASS/Ramsay
- 96a6b02d docs: 台账回写

## 新增路由
POST /api/v1/icu/notes/admission（icu_doctor 转入）
POST /api/v1/icu/notes/discharge（icu_doctor 转出）
POST /api/v1/icu/notes/:visitId/vitals（icu_nurse 多时间点体征）
GET  /api/v1/icu/notes/:visitId/vitals（按 recordedAt 升序）
POST /api/v1/icu/notes/:visitId/scores（icu_doctor APACHE II/SOFA/RASS/Ramsay）

## 评分引擎测试向量
APACHE II 全正常=0；重病 28；SOFA 各系统 1=6；全 4=24；RASS -5~+4；Ramsay 1~6

## 门禁（我本人复跑）
- 单测：20 pass / 0 fail / 26 expect
- E2E：8 pass / 0 fail / 25 expect（重启 BFF 清库存后独立复跑）
- 双 tsc 双零
- 品牌 16 词 0 命中

## 权限
icu_doctor 转入/评分 OK；录体征 403；icu_nurse 录体征 OK；转入/评分 403

## 状态机/校验
重复转入 409；未转入即转出 409；同 recordedAt 重复录体征 409；HR=999/GCS=20/SpO2=50 400；RASS=6/Ramsay=0 400；行级错配 403

## BFF pid
多轮重启后当前本人复跑重启；六端点全 200；5173 未动

## 未覆盖
CAM-ICU 谵妄评分、24h 出入量汇总、呼吸机/输液泵设备数据接入、Q1H/Q2H 定时提醒