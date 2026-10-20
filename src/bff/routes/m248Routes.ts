/**
 * 健澜科技 jlmedaios - M248 业务域扩展（CDS 深度 + 护理 NQI）
 *
 * 患者时间线/药物相互作用/剂量范围/禁忌症审查 + 护理质量指标/趋势
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、CDS 临床决策支持 ==================== */

/** GET /api/v1/cds/patient-timeline - 患者时间线 5 条 */
async function handleCdsPatientTimeline(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const events = [
    { id: 'TL-001', patient: '张***（MRN-100451）', type: '就诊', time: '2026-10-20 08:30', dept: '心内科', desc: '门诊就诊，主诉胸闷 3 天' },
    { id: 'TL-002', patient: '张***（MRN-100451）', type: '检查', time: '2026-10-20 09:00', dept: '放射科', desc: '胸部 CT（平扫），未见明显异常' },
    { id: 'TL-003', patient: '张***（MRN-100451）', type: '用药', time: '2026-10-20 09:30', dept: '心内科', desc: '开具阿司匹林 100mg qd' },
    { id: 'TL-004', patient: '张***（MRN-100451）', type: '手术', time: '2026-10-18 14:00', dept: '心内科', desc: '冠脉造影（CAG），LAD 中段狭窄 50%' },
    { id: 'TL-005', patient: '张***（MRN-100451）', type: '出院', time: '2026-10-10 10:00', dept: '心内科', desc: '上次住院出院，诊断：不稳定型心绞痛' },
  ];

  return json(ok({ events, totalCount: events.length }));
}

/** GET /api/v1/cds/interaction-check - 药物相互作用 5 条 */
async function handleCdsInteractionCheck(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const interactions = [
    { id: 'INT-001', drugA: '华法林', drugB: '阿司匹林', severity: '严重', mechanism: '协同抗凝增加出血风险', advice: '避免联用，或密切监测 INR' },
    { id: 'INT-002', drugA: '阿托伐他汀', drugB: '克拉霉素', severity: '中度', mechanism: 'CYP3A4 抑制增加他汀血药浓度', advice: '暂停他汀或减量 50%' },
    { id: 'INT-003', drugA: '二甲双胍', drugB: '造影剂', severity: '中度', mechanism: '增加乳酸酸中毒风险', advice: '造影前后 48h 停用二甲双胍' },
    { id: 'INT-004', drugA: 'ACEI（依那普利）', drugB: '保钾利尿剂（螺内酯）', severity: '中度', mechanism: '高钾血症风险', advice: '监测血钾' },
    { id: 'INT-005', drugA: '布洛芬', drugB: '华法林', severity: '轻度', mechanism: '轻度影响血小板功能', advice: '短期使用可接受，监测出血' },
  ];

  return json(ok({ interactions, totalCount: interactions.length }));
}

/** GET /api/v1/cds/dose-range - 剂量范围审查 5 条 */
async function handleCdsDoseRange(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const doses = [
    { id: 'DOSE-001', drug: '对乙酰氨基酚', age: '成人（18-65）', weight: '50-100kg', standard: '500mg q6h', maxSafe: '4g/日' },
    { id: 'DOSE-002', drug: '对乙酰氨基酚', age: '儿童（3-12 岁）', weight: '15-40kg', standard: '10-15mg/kg q6h', maxSafe: '75mg/kg/日' },
    { id: 'DOSE-003', drug: '万古霉素', age: '成人', weight: '60-90kg', standard: '15mg/kg q12h（按血药浓度调整）', maxSafe: '2g/次' },
    { id: 'DOSE-004', drug: '吗啡', age: '成人（肾功能正常）', weight: '50-80kg', standard: '5-10mg q4h IV', maxSafe: '10mg/次' },
    { id: 'DOSE-005', drug: '阿司匹林', age: '成人（心血管二级预防）', weight: '50-100kg', standard: '75-100mg qd', maxSafe: '325mg/日' },
  ];

  return json(ok({ doses, totalCount: doses.length }));
}

/** GET /api/v1/cds/contraindication - 禁忌症审查 5 条 */
async function handleCdsContraindication(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const contraindications = [
    { id: 'CON-001', drug: '阿司匹林', type: '绝对禁忌', patientCondition: '活动性消化道出血', severity: '严重', advice: '禁用，换用氯吡格雷' },
    { id: 'CON-002', drug: '二甲双胍', type: '绝对禁忌', patientCondition: 'eGFR < 30 mL/min', severity: '严重', advice: '禁用' },
    { id: 'CON-003', drug: 'ACEI（依那普利）', type: '绝对禁忌', patientCondition: '妊娠中晚期', severity: '严重', advice: '禁用，换用甲基多巴' },
    { id: 'CON-004', drug: 'NSAIDs（布洛芬）', type: '相对禁忌', patientCondition: '慢性肾病 3 期', severity: '中度', advice: '慎用，优先选择对乙酰氨基酚' },
    { id: 'CON-005', drug: '华法林', type: '相对禁忌', patientCondition: '跌倒高风险老年患者', severity: '中度', advice: '评估获益风险，考虑 DOACs' },
  ];

  return json(ok({ contraindications, totalCount: contraindications.length }));
}

/* ==================== 二、护理 NQI 质量指标 ==================== */

/** GET /api/v1/nursing/nqi-scores - 护理质量指标 5 条 */
async function handleNursingNqiScores(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const indicators = [
    { id: 'NQI-001', name: '跌倒发生率', dept: '全院', thisMonth: '0.8‰', target: '≤ 1.0‰', compliance: '达标' },
    { id: 'NQI-002', name: '压力性损伤发生率', dept: '全院', thisMonth: '1.2%', target: '≤ 1.5%', compliance: '达标' },
    { id: 'NQI-003', name: '管路滑脱率', dept: '全院', thisMonth: '0.3‰', target: '≤ 0.5‰', compliance: '达标' },
    { id: 'NQI-004', name: '给药错误发生率', dept: '全院', thisMonth: '0.2‰', target: '≤ 0.3‰', compliance: '达标' },
    { id: 'NQI-005', name: '护士床位比', dept: '全院', thisMonth: '1:0.42', target: '≥ 1:0.4', compliance: '达标' },
  ];

  return json(ok({ indicators, totalCount: indicators.length }));
}

/** GET /api/v1/nursing/nqi-trend - 护理质量趋势 12 个月 */
async function handleNursingNqiTrend(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const trend = [
    { month: '2025-11', indicator: '跌倒发生率（‰）', actual: 1.2, target: 1.0 },
    { month: '2025-12', indicator: '跌倒发生率（‰）', actual: 1.1, target: 1.0 },
    { month: '2026-01', indicator: '跌倒发生率（‰）', actual: 1.0, target: 1.0 },
    { month: '2026-02', indicator: '跌倒发生率（‰）', actual: 1.0, target: 1.0 },
    { month: '2026-03', indicator: '跌倒发生率（‰）', actual: 0.9, target: 1.0 },
    { month: '2026-04', indicator: '跌倒发生率（‰）', actual: 0.9, target: 1.0 },
    { month: '2026-05', indicator: '跌倒发生率（‰）', actual: 0.85, target: 1.0 },
    { month: '2026-06', indicator: '跌倒发生率（‰）', actual: 0.85, target: 1.0 },
    { month: '2026-07', indicator: '跌倒发生率（‰）', actual: 0.82, target: 1.0 },
    { month: '2026-08', indicator: '跌倒发生率（‰）', actual: 0.8, target: 1.0 },
    { month: '2026-09', indicator: '跌倒发生率（‰）', actual: 0.8, target: 1.0 },
    { month: '2026-10', indicator: '跌倒发生率（‰）', actual: 0.8, target: 1.0 },
  ];

  return json(ok({ trend, totalCount: trend.length }));
}

export const m248Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/cds/patient-timeline', handle: handleCdsPatientTimeline, auth: true },
  { method: 'GET', path: '/api/v1/cds/interaction-check', handle: handleCdsInteractionCheck, auth: true },
  { method: 'GET', path: '/api/v1/cds/dose-range', handle: handleCdsDoseRange, auth: true },
  { method: 'GET', path: '/api/v1/cds/contraindication', handle: handleCdsContraindication, auth: true },
  { method: 'GET', path: '/api/v1/nursing/nqi-scores', handle: handleNursingNqiScores, auth: true },
  { method: 'GET', path: '/api/v1/nursing/nqi-trend', handle: handleNursingNqiTrend, auth: true },
];
