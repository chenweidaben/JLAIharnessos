/**
 * 健澜科技 jlmedaios - M479 P0 合规：医院感染管理 + 患者安全事件闭环
 *
 * 院感发病率 / 多重耐药菌检出 / 患者安全事件 / 患者安全RCA / 医疗风险预警
 * （infection/hand-hygiene 已存在，不重复建）。
 * 避开 M444 infection 既有、M461 exposure/*、M466 incident/*、M476 critical-value、M471-M478 各端点、/outpatient/* 路由。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/infection/hospital-acquired - 院感发病率（感染类型/VAP/CLABSI/CAUTI/手术部位感染/千日感染率）5 条 */
async function handleHospitalAcquired(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HAI-001', type: '感染类型：VAP（呼吸机相关肺炎）', denominator: 'ICU 机械通气日：486 日', count: '感染例数：2 例', rate: '千日感染率：4.1‰（千机械通气日）', target: '目标值：≤5.0‰（达标）' },
    { id: 'HAI-002', type: '感染类型：CLABSI（中心静脉导管相关血流感染）', denominator: '中心静脉导管日：1,240 日', count: '感染例数：1 例', rate: '千日感染率：0.8‰（千导管日）', target: '目标值：≤1.0‰（达标）' },
    { id: 'HAI-003', type: '感染类型：CAUTI（导尿管相关尿路感染）', denominator: '导尿管日：2,180 日', count: '感染例数：3 例', rate: '千日感染率：1.4‰（千导管日）', target: '目标值：≤2.0‰（达标）' },
    { id: 'HAI-004', type: '感染类型：SSI（手术部位感染·清洁切口）', denominator: '清洁手术例数：1,860 例', count: '感染例数：6 例', rate: '感染率：0.32%（百手术例）', target: '目标值：≤0.5%（达标）' },
    { id: 'HAI-005', type: '感染类型：全院院感综合（现患率口径）', denominator: '在院患者同步调查：1,386 人', count: '感染例数：18 例', rate: '现患率：1.30%', target: '目标值：≤1.5%（达标，同比下降）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/infection/multidrug-resistant - 多重耐药菌检出（MDRO类型/MRSA/CRE/CRAB/检出率/隔离率）5 条 */
async function handleMdro(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MDRO-001', type: 'MDRO 类型：MRSA（耐甲氧西林金黄色葡萄球菌）', detected: '检出例数：本月 11 例', rate: '检出率：占金葡菌 32%（目标 ≤30%，略超需干预）', isolate: '隔离率：100%（接触隔离已落实）' },
    { id: 'MDRO-002', type: 'MDRO 类型：CRE（耐碳青霉烯肠杆菌目）', detected: '检出例数：本月 6 例', rate: '检出率：占肠杆菌目 4.2%（目标 ≤5%，达标）', isolate: '隔离率：100%（单间/床旁隔离）' },
    { id: 'MDRO-003', type: 'MDRO 类型：CRAB（耐碳青霉烯鲍曼不动杆菌）', detected: '检出例数：本月 9 例', rate: '检出率：占不动杆菌 58%（ICU 集中，需强化环境消毒）', isolate: '隔离率：100%' },
    { id: 'MDRO-004', type: 'MDRO 类型：CRPA（耐碳青霉烯铜绿假单胞菌）', detected: '检出例数：本月 4 例', rate: '检出率：占铜绿 18%（目标 ≤20%，达标）', isolate: '隔离率：100%' },
    { id: 'MDRO-005', type: 'MDRO 类型：VRE（耐万古霉素肠球菌）', detected: '检出例数：本月 1 例', rate: '检出率：占肠球菌 2.5%（散发）', isolate: '隔离率：100%（散发监测中）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/patient-safety/events - 患者安全事件（事件类型/跌倒/给药错误/压疮/走失/发生例数）5 条 */
async function handlePatientSafetyEvents(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PSE-001', type: '事件类型：住院跌倒', count: '发生例数：6 例（其中高危 4 例）', harm: '伤害等级：无伤害 4、轻度 2、重度 0', dept: '主要科室：老年/神经内科病房', handle: '处置：已评估根因、床旁陪护/防滑干预' },
    { id: 'PSE-002', type: '事件类型：给药错误（无伤害拦截）', count: '发生例数：2 例（1 起送达前拦截）', harm: '伤害等级：无伤害（拦截）/ 轻度 1 例', dept: '主要科室：内科病区', handle: '处置：PDA 闭环核对强化' },
    { id: 'PSE-003', type: '事件类型：院内压力性损伤（II 期及以上）', count: '发生例数：4 例', harm: '伤害等级：II 期 3、III 期 1', dept: '主要科室：ICU/老年卧床患者', handle: '处置：翻身频次/减压床垫干预' },
    { id: 'PSE-004', type: '事件类型：管路非计划滑脱', count: '发生例数：3 例', harm: '伤害等级：轻度 3、重度 0', dept: '主要科室：ICU/神外', handle: '处置：双重固定 + 镇静评分联动' },
    { id: 'PSE-005', type: '事件类型：患者走失/身份识别错误（未遂）', count: '发生例数：1 例（身份带识别提醒，未遂）', harm: '伤害等级：无伤害（未遂隐患）', dept: '主要科室：门诊/住院窗口', handle: '处置：腕带双标识核对强化' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/patient-safety/rca - 患者安全根因分析RCA（科室/事件数/RCA完成数/逾期数/闭环率）5 条 */
async function handlePatientSafetyRca(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PSR-001', dept: '科室：全院患者安全RCA汇总', events: '事件数：本月重大/警讯事件 5 起需RCA', done: 'RCA 完成数：4 起', overdue: '逾期数：1 起（超 15 个工作日）', closed: '闭环率：80%（整改措施已落地并验证）' },
    { id: 'PSR-002', dept: '科室：急诊科', events: '事件数：2 起（跌倒/沟通类）', done: 'RCA 完成数：2 起', overdue: '逾期数：0', closed: '闭环率：100%' },
    { id: 'PSR-003', dept: '科室：内科病区', events: '事件数：1 起（给药错误未遂）', done: 'RCA 完成数：1 起', overdue: '逾期数：0', closed: '闭环率：100%（PDA 闭环整改）' },
    { id: 'PSR-004', dept: '科室：ICU', events: '事件数：1 起（管路滑脱）', done: 'RCA 完成数：0（逾期）', overdue: '逾期数：1 起（整改方案起草中）', closed: '闭环率：0%（待完成，已督办）' },
    { id: 'PSR-005', dept: '科室：妇产科', events: '事件数：1 起（产后观察流程）', done: 'RCA 完成数：1 起', overdue: '逾期数：0', closed: '闭环率：100%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/quality/risk-warning - 医疗风险预警（科室/高风险患者数/已干预数/预警数/解除率）5 条 */
async function handleRiskWarning(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'QRW-001', dept: '科室：全院风险预警汇总', highRisk: '高风险患者数：42 人（跌倒/压疮/VTE/自杀倾向等）', intervened: '已干预数：38 人', alerts: '本月预警触发：86 次', release: '解除率：90.5%（风险降级后解除）' },
    { id: 'QRW-002', dept: '科室：老年/神经内科', highRisk: '高风险患者数：12 人（跌倒+压疮为主）', intervened: '已干预数：11 人', alerts: '本月预警：24 次', release: '解除率：91.7%' },
    { id: 'QRW-003', dept: '科室：骨科', highRisk: '高风险患者数：9 人（VTE+跌倒）', intervened: '已干预数：9 人', alerts: '本月预警：18 次', release: '解除率：100%' },
    { id: 'QRW-004', dept: '科室：ICU', highRisk: '高风险患者数：14 人（多重风险叠加）', intervened: '已干预数：12 人', alerts: '本月预警：32 次', release: '解除率：85.7%（部分持续监护中）' },
    { id: 'QRW-005', dept: '科室：肿瘤科（含心理风险）', highRisk: '高风险患者数：7 人（含心理评估高风险）', intervened: '已干预数：6 人', alerts: '本月预警：12 次', release: '解除率：85.7%（心理干预随访中）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m479Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/infection/hospital-acquired', handle: handleHospitalAcquired, auth: true },
  { method: 'GET', path: '/api/v1/infection/multidrug-resistant', handle: handleMdro, auth: true },
  { method: 'GET', path: '/api/v1/patient-safety/events', handle: handlePatientSafetyEvents, auth: true },
  { method: 'GET', path: '/api/v1/patient-safety/rca', handle: handlePatientSafetyRca, auth: true },
  { method: 'GET', path: '/api/v1/quality/risk-warning', handle: handleRiskWarning, auth: true },
];
