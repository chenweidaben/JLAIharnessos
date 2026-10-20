/**
 * 健澜科技 jlmedaios - M510 P0 合规重点（智慧护理·NQI 深度）：护理 NQI 敏感质量指标深度监控 3 端点
 *
 * nursing/nqi/incidents 护理不良事件、nursing/nqi/prevention 预防措施执行、nursing/nqi/stats NQI 统计。
 * 与 M492 /nursing/schedule|grading|adverse-events、M476 /nursing/sensitive|rounds|quality-checks、
 * M509 /cds/*、M508 /timeline/*、/outpatient/* 路由区分（走 nursing/nqi/ 子前缀）。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/nursing/nqi/incidents - 护理不良事件（类型Tag/科室/严重程度Tag/时间）5 条 */
async function handleNursingNqiIncidents(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NNI-001', type: '事件类型Tag：跌倒橙（老年患者夜间如厕跌倒，无骨折）', dept: '发生科室：老年医学科', severity: '严重程度Tag：轻绿（擦伤，已清创处理）', time: '发生时间：2026-10-19 23:15（夜间巡视间隙）' },
    { id: 'NNI-002', type: '事件类型Tag：压疮红（骶尾部 III 期压疮，住院 14 天后发现）', dept: '发生科室：神经内科（昏迷卧床患者）', severity: '严重程度Tag：重红（III 期，需换药+营养支持）', time: '发生时间：2026-10-18 09:00（晨间护理发现）' },
    { id: 'NNI-003', type: '事件类型Tag：管路滑脱紫（胃管非计划脱出，患者躁动自行拔管）', dept: '发生科室：消化内科（ICU 转入）', severity: '严重程度Tag：中橙（需重置胃管，未发生误吸）', time: '发生时间：2026-10-17 03:30（夜班巡视间隙）' },
    { id: 'NNI-004', type: '事件类型Tag：约束蓝（腕部约束处皮肤红肿，约束时间过久）', dept: '发生科室：精神科', severity: '严重程度Tag：轻绿（局部红肿，松解后好转）', time: '发生时间：2026-10-16 14:00（午后评估发现）' },
    { id: 'NNI-005', type: '事件类型Tag：疼痛未评绿（术后 24h 未进行疼痛复评，NRS 评分缺失）', dept: '发生科室：普外科（术后病房）', severity: '严重程度Tag：轻绿（流程缺陷，患者实际已通过用药控制疼痛）', time: '发生时间：2026-10-15 10:00（护士长查房发现）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nursing/nqi/prevention - 预防措施执行（措施类型Tag/执行率Tag/科室）5 条 */
async function handleNursingNqiPrevention(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NNP-001', measure: '措施类型Tag：翻身（卧床患者 q2h 翻身，预防压疮）', rate: '执行率Tag：≥95% 绿（98.5%，200 例卧床患者中 197 例按 q2h 执行翻身）', dept: '执行科室：全院综合（重点 ICU/神内/老年医学科）' },
    { id: 'NNP-002', measure: '措施类型Tag：床栏（高跌倒风险患者床栏全程拉起）', rate: '执行率Tag：85-95% 橙（92%，夜间巡视时 8% 患者床栏未拉起）', dept: '执行科室：老年医学科 / 骨科 / 神内' },
    { id: 'NNP-003', measure: '措施类型Tag：警示标识（跌倒/压疮/管路滑脱高风险患者佩戴腕带标识）', rate: '执行率Tag：≥95% 绿（99.2%）', dept: '执行科室：全院（入院评估时即佩戴）' },
    { id: 'NNP-004', measure: '措施类型Tag：约束评估（约束患者每 2h 评估一次必要性）', rate: '执行率Tag：<85% 红（78%，精神科/ICU 约束患者评估记录缺失较多）', dept: '执行科室：精神科 / ICU（需重点整改）' },
    { id: 'NNP-005', measure: '措施类型Tag：疼痛复评（术后患者用药后 1h 复评 NRS）', rate: '执行率Tag：85-95% 橙（88%，普外科/骨科术后复评率偏低）', dept: '执行科室：普外科 / 骨科 / 胸外科' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nursing/nqi/stats - NQI 统计（月份/不良事件总数/发生率Tag/执行率/疼痛评估覆盖率）5 条 */
async function handleNursingNqiStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NNS-001', month: '月份：2026-10（本月累计，截至 10-20）', incidents: '本月不良事件总数：8 起（跌倒 3 / 压疮 1 / 管路滑脱 2 / 约束 1 / 疼痛未评 1）', rate: '发生率Tag：0.18‰（8 起 / 4,400 住院床日，优于院控目标 ≤0.25‰）', exec: '预防措施执行率：翻身 98.5% / 床栏 92% / 警示标识 99.2% / 约束评估 78% / 疼痛复评 88%', pain: '疼痛评估覆盖率：95%（术后患者 NRS 评估覆盖率，目标 ≥90%）' },
    { id: 'NNS-002', month: '月份：2026-09（上月完整数据）', incidents: '本月不良事件总数：10 起', rate: '发生率Tag：0.22‰', exec: '预防措施执行率：翻身 97.8% / 床栏 90% / 警示标识 98.5% / 约束评估 82% / 疼痛复评 85%', pain: '疼痛评估覆盖率：93%' },
    { id: 'NNS-003', month: '月份：2026-08', incidents: '本月不良事件总数：12 起', rate: '发生率Tag：0.26‰（超过院控目标）', exec: '预防措施执行率：翻身 96.5% / 床栏 88% / 警示标识 97% / 约束评估 75% / 疼痛复评 82%', pain: '疼痛评估覆盖率：90%' },
    { id: 'NNS-004', month: '月份：2026-Q3 汇总（7-9 月）', incidents: '季度不良事件总数：35 起', rate: '发生率Tag：0.24‰（季度平均）', exec: '季度预防措施执行率：翻身 97.5% / 床栏 89% / 警示标识 98% / 约束评估 79% / 疼痛复评 85%', pain: '季度疼痛评估覆盖率：92%' },
    { id: 'NNS-005', month: '月份：2026-10 分类型统计', incidents: '跌倒 3 起（老年科 2 / 骨科 1）/ 压疮 1 起（神内）/ 管路滑脱 2 起（消化内 1 / 神外 1）/ 约束 1 起（精神科）/ 疼痛未评 1 起（普外科）', rate: '高风险科室Tag：精神科（约束评估率仅 65%，需重点整改）', exec: '执行率最低项：约束评估 78%（目标 ≥95%，差距 17 个百分点）', pain: '疼痛评估最低科室：普外科 82%（需加强术后复评流程）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m510Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/nursing/nqi/incidents', handle: handleNursingNqiIncidents, auth: true },
  { method: 'GET', path: '/api/v1/nursing/nqi/prevention', handle: handleNursingNqiPrevention, auth: true },
  { method: 'GET', path: '/api/v1/nursing/nqi/stats', handle: handleNursingNqiStats, auth: true },
];
