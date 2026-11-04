# P1-6 院前住院管家 简报（00:50 轮）

## commit
- 6764595a feat(concierge): 预入院/报到+清单+宣教+检查预约+家属授权
- 5e14403d docs: 台账回写

## 新增路由
POST /api/v1/inpatient-concierge/pre-admission
POST .../:preAdmissionId/check-in（护士站报到，重复 409/过期 400）
GET/POST .../:preAdmissionId/checklist（10 条准备清单 toggle）
POST/GET .../:preAdmissionId/education（三通道宣教）
GET  .../:preAdmissionId/lab-radiology/slots
POST .../:preAdmissionId/lab-radiology/book（时段互斥 409）
POST /api/v1/inpatient-concierge/authorization（患者授权家属代办）

## 门禁（我本人复跑）
- 单测：14 pass / 0 fail / 21 expect
- E2E：6 pass / 0 fail / 23 expect（重启 BFF 清库存后独立复跑）
- 双 tsc 双零
- 品牌 16 词 0 命中

## 权限/授权链
patient 自己事务 OK；家属无授权 403、有授权 scope 匹配才 OK；nurse 报到/宣教 OK；patient 给别人操作 403

## 状态机
重复报到 409；过期 >7 天报到 400；同 patient+exam+slot 重复 book 409；非法时段 400；清单 done 幂等

## BFF pid
多轮重启后当前本人复跑重启；六端点全 200；5173 未动

## 未覆盖
真实短信/微信网关、检查排班接真实 HIS、清单模板自定义、床位等待队列