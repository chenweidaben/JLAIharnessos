/**
 * 健澜科技 jlmedaios - M319 CDS 补建 + 患者时间线域
 *
 * 补建 CDS 预警/患者摘要/临床推荐 + 患者时间线概览/事件/就诊/用药/检验/警示
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ========== 一、补建 3 个 CDS 缺失接口 ========== */

/** GET /api/v1/cds/alert - CDS 预警 5 条（补建） */
async function handleCdsAlert(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CA-001', alertNo: 'ALERT-20261020-001', type: '药物相互作用', patient: '王***（心内科 3 床）', content: '阿司匹林 + 华法林联用出血风险增加 3 倍', level: '高（建议调整用药方案）' },
    { id: 'CA-002', alertNo: 'ALERT-20261020-002', type: '检验危急值', patient: '李***（心内科 5 床）', content: '血钾 6.8 mmol/L（参考值 3.5-5.5）', level: '紧急（立即处理）' },
    { id: 'CA-003', alertNo: 'ALERT-20261019-003', type: '过敏史提醒', patient: '张***（呼吸内科 8 床）', content: '患者有青霉素过敏史，本次处方含阿莫西林', level: '高（立即更换抗生素）' },
    { id: 'CA-004', alertNo: 'ALERT-20261019-004', type: '重复用药', patient: '赵***（消化内科 10 床）', content: '同时开具奥美拉唑和雷贝拉唑（同类质子泵抑制剂）', level: '中（建议精简）' },
    { id: 'CA-005', alertNo: 'ALERT-20261018-005', type: '剂量超限', patient: '孙***（普外科 12 床）', content: '对乙酰氨基酚单日剂量 4.5g（上限 4g）', level: '中（建议减量）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/patient-summary - 患者摘要 5 条（补建） */
async function handleCdsPatientSummary(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CPS-001', patient: '王***（男，65 岁，心内科 3 床）', chiefComplaint: '胸痛 3 小时', diagnosis: '急性前壁心肌梗死', treatment: '急诊 PCI + 双联抗血小板 + ACEI + β 受体阻滞剂', status: '术后第 1 天，生命体征平稳' },
    { id: 'CPS-002', patient: '李***（女，58 岁，心内科 5 床）', chiefComplaint: '咳嗽咳痰 5 天，发热 38.5℃', diagnosis: '社区获得性肺炎（右肺）', treatment: '头孢呋辛静滴 + 祛痰 + 雾化吸入', status: '抗感染第 2 天，体温 37.8℃' },
    { id: 'CPS-003', patient: '张***（男，72 岁，呼吸内科 8 床）', chiefComplaint: '多饮多尿 3 个月，体重下降 5kg', diagnosis: '2 型糖尿病', treatment: '二甲双胍 + 饮食控制 + 运动指导', status: '血糖调整第 3 天，空腹血糖 8.2 mmol/L' },
    { id: 'CPS-004', patient: '赵***（女，45 岁，消化内科 10 床）', chiefComplaint: '腹痛 6 小时，右上腹压痛', diagnosis: '急性胆囊炎', treatment: '禁食 + 抗感染 + 腹腔镜胆囊切除术（明日手术）', status: '术前抗感染第 1 天，腹痛缓解' },
    { id: 'CPS-005', patient: '孙***（男，68 岁，普外科 12 床）', chiefComplaint: '突发右侧肢体无力 2 小时', diagnosis: '急性脑梗死（左侧基底节区）', treatment: 'rt-PA 溶栓 + 抗血小板 + 他汀 + 康复训练', status: '溶栓后第 5 天，NIHSS 评分由 8 分降至 4 分' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/recommendation - 临床推荐 5 条（补建） */
async function handleCdsRecommendation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CR-001', recNo: 'REC-20261020-001', type: '治疗推荐', content: '急性 STEMI 患者建议急诊 PCI（发病 12 小时内）', basis: '2025 年 ESC 急性心梗指南 + 中国经皮冠状动脉介入治疗指南', confidence: '98%' },
    { id: 'CR-002', recNo: 'REC-20261020-002', type: '用药推荐', content: '社区获得性肺炎（非重症）经验性抗感染首选 β 内酰胺类/β 内酰胺酶抑制剂 + 大环内酯类', basis: '2025 年中国成人社区获得性肺炎诊断和治疗指南', confidence: '92%' },
    { id: 'CR-003', recNo: 'REC-20261019-003', type: '检查推荐', content: '2 型糖尿病初诊患者建议行 HbA1c + 空腹血糖 + 餐后 2 小时血糖 + 尿微量白蛋白/肌酐比值', basis: '2025 年中国 2 型糖尿病防治指南', confidence: '95%' },
    { id: 'CR-004', recNo: 'REC-20261019-004', type: '手术推荐', content: '急性胆囊炎患者建议发病 72 小时内行腹腔镜胆囊切除术', basis: '2025 年东京指南 + 中国急性胆道感染诊疗共识', confidence: '90%' },
    { id: 'CR-005', recNo: 'REC-20261018-005', type: '康复推荐', content: '急性脑梗死后 24-48 小时生命体征平稳后建议早期康复介入', basis: '2025 年中国脑卒中早期康复指南', confidence: '93%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/* ========== 二、新增 6 个患者时间线接口 ========== */

/** GET /api/v1/patient/timeline-overview - 时间线概览 5 条 */
async function handlePatientTimelineOverview(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PTO-001', patient: '王***（男，65 岁）', totalEvents: '156 个事件', visits: '门诊 23 次 + 住院 5 次', medications: '38 种药品（累计）', lastUpdate: '2026-10-20 10:30' },
    { id: 'PTO-002', patient: '李***（女，58 岁）', totalEvents: '89 个事件', visits: '门诊 15 次 + 住院 2 次', medications: '12 种药品（累计）', lastUpdate: '2026-10-19 15:00' },
    { id: 'PTO-003', patient: '张***（男，72 岁）', totalEvents: '234 个事件', visits: '门诊 45 次 + 住院 8 次', medications: '56 种药品（累计）', lastUpdate: '2026-10-19 09:00' },
    { id: 'PTO-004', patient: '赵***（女，45 岁）', totalEvents: '67 个事件', visits: '门诊 12 次 + 住院 1 次', medications: '8 种药品（累计）', lastUpdate: '2026-10-18 14:30' },
    { id: 'PTO-005', patient: '孙***（男，68 岁）', totalEvents: '198 个事件', visits: '门诊 32 次 + 住院 6 次', medications: '42 种药品（累计）', lastUpdate: '2026-10-18 11:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/patient/timeline-events - 时间线事件 5 条 */
async function handlePatientTimelineEvents(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PTE-001', patient: '王***', eventType: '急诊入院', time: '2026-10-20 08:00', description: '因胸痛 3 小时急诊入院，心电图 V1-V4 ST 段抬高', linked: '关联就诊：门诊 2026-10-20-001 / 诊断：急性前壁心肌梗死' },
    { id: 'PTE-002', patient: '李***', eventType: '检验异常', time: '2026-10-19 10:30', description: '血常规提示白细胞 12×10⁹/L，中性粒细胞 85%', linked: '关联检验：血常规 2026-10-19-001 / 诊断：社区获得性肺炎' },
    { id: 'PTE-003', patient: '张***', eventType: '处方开具', time: '2026-10-18 14:00', description: '二甲双胍 0.5g bid 口服（降糖治疗）', linked: '关联处方：RX-20261018-001 / 药品：二甲双胍肠溶片' },
    { id: 'PTE-004', patient: '赵***', eventType: '手术安排', time: '2026-10-18 09:00', description: '腹腔镜胆囊切除术排程（明日 08:00，手术室 3 号间）', linked: '关联手术：OP-20261019-001 / 科室：普外科' },
    { id: 'PTE-005', patient: '孙***', eventType: '康复评估', time: '2026-10-17 16:00', description: 'Brunnstrom 分期评估：右上肢 III 期，右下肢 IV 期', linked: '关联康复：REHAB-20261017-001 / 科室：康复医学科' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/patient/timeline-encounters - 就诊时间线 5 条 */
async function handlePatientTimelineEncounters(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PTE-001', patient: '王***', encounterNo: 'ENC-20261020-001', department: '心内科（急诊）', time: '2026-10-20 08:00', diagnosis: '急性前壁心肌梗死' },
    { id: 'PTE-002', patient: '王***', encounterNo: 'ENC-2026-0315-002', department: '心内科（门诊）', time: '2026-03-15 09:30', diagnosis: '高血压病 3 级（很高危）' },
    { id: 'PTE-003', patient: '李***', encounterNo: 'ENC-20261019-001', department: '呼吸内科（门诊）', time: '2026-10-19 10:00', diagnosis: '社区获得性肺炎' },
    { id: 'PTE-004', patient: '张***', encounterNo: 'ENC-20261018-001', department: '内分泌科（门诊）', time: '2026-10-18 14:00', diagnosis: '2 型糖尿病' },
    { id: 'PTE-005', patient: '孙***', encounterNo: 'ENC-20261017-001', department: '神经内科（急诊）', time: '2026-10-17 08:30', diagnosis: '急性脑梗死' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/patient/timeline-medications - 用药时间线 5 条 */
async function handlePatientTimelineMedications(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PTM-001', patient: '王***', drug: '阿司匹林肠溶片 100mg', startTime: '2026-10-20 08:30', endTime: '长期服用', dose: '100mg qd（每日一次）' },
    { id: 'PTM-002', patient: '王***', drug: '替格瑞洛片 90mg', startTime: '2026-10-20 08:30', endTime: '12 个月（双联抗血小板）', dose: '90mg bid（每日两次）' },
    { id: 'PTM-003', patient: '李***', drug: '头孢呋辛钠 1.5g', startTime: '2026-10-19 10:30', endTime: '2026-10-26（7 天疗程）', dose: '1.5g q8h（每 8 小时一次，静滴）' },
    { id: 'PTM-004', patient: '张***', drug: '二甲双胍肠溶片 0.5g', startTime: '2026-10-18 14:30', endTime: '长期服用', dose: '0.5g bid（每日两次，口服）' },
    { id: 'PTM-005', patient: '孙***', drug: '阿托伐他汀钙片 20mg', startTime: '2026-10-17 09:00', endTime: '长期服用', dose: '20mg qn（每晚一次，口服）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/patient/timeline-results - 检验检查时间线 5 条 */
async function handlePatientTimelineResults(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PTR-001', patient: '王***', item: '心肌酶谱（CK-MB / cTnI）', time: '2026-10-20 08:15', result: 'CK-MB 45 ng/ml（参考 <5）/ cTnI 8.5 ng/ml（参考 <0.04）', status: '危急值（支持心梗诊断）' },
    { id: 'PTR-002', patient: '王***', item: '心电图（12 导联）', time: '2026-10-20 08:05', result: '窦性心律，V1-V4 ST 段抬高 0.3mV', status: '异常（提示急性前壁心梗）' },
    { id: 'PTR-003', patient: '李***', item: '血常规', time: '2026-10-19 10:15', result: 'WBC 12×10⁹/L / NEU% 85% / CRP 45 mg/L', status: '异常（提示细菌感染）' },
    { id: 'PTR-004', patient: '张***', item: 'HbA1c（糖化血红蛋白）', time: '2026-10-18 14:15', result: 'HbA1c 8.5%（参考 <6.5%）', status: '异常（支持糖尿病诊断）' },
    { id: 'PTR-005', patient: '孙***', item: '头颅 CT', time: '2026-10-17 08:45', result: '未见出血灶，左侧基底节区可疑低密度灶', status: '正常（排除出血，支持脑梗死）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/patient/timeline-alerts - 警示时间线 5 条 */
async function handlePatientTimelineAlerts(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PTA-001', patient: '王***', alertType: '药物相互作用预警', time: '2026-10-20 09:00', content: '阿司匹林 + 华法林联用出血风险增加', handling: '已处理：停用华法林，改用双联抗血小板' },
    { id: 'PTA-002', patient: '李***', alertType: '过敏史提醒', time: '2026-10-19 10:30', content: '患者有青霉素过敏史，处方含阿莫西林', handling: '已处理：更换为头孢呋辛' },
    { id: 'PTA-003', patient: '张***', alertType: '检验危急值', time: '2026-10-18 15:00', content: '空腹血糖 9.8 mmol/L（参考 3.9-6.1）', handling: '已处理：内分泌科会诊，调整降糖方案' },
    { id: 'PTA-004', patient: '赵***', alertType: '重复用药提醒', time: '2026-10-18 11:00', content: '奥美拉唑 + 雷贝拉唑（同类 PPI）', handling: '已处理：停用雷贝拉唑，保留奥美拉唑' },
    { id: 'PTA-005', patient: '孙***', alertType: '剂量超限提醒', time: '2026-10-17 10:00', content: '对乙酰氨基酚单日剂量 4.5g（上限 4g）', handling: '已处理：减量至 3g/日' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m319Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/cds/alert', handle: handleCdsAlert, auth: true },
  { method: 'GET', path: '/api/v1/cds/patient-summary', handle: handleCdsPatientSummary, auth: true },
  { method: 'GET', path: '/api/v1/cds/recommendation', handle: handleCdsRecommendation, auth: true },
  { method: 'GET', path: '/api/v1/patient/timeline-overview', handle: handlePatientTimelineOverview, auth: true },
  { method: 'GET', path: '/api/v1/patient/timeline-events', handle: handlePatientTimelineEvents, auth: true },
  { method: 'GET', path: '/api/v1/patient/timeline-encounters', handle: handlePatientTimelineEncounters, auth: true },
  { method: 'GET', path: '/api/v1/patient/timeline-medications', handle: handlePatientTimelineMedications, auth: true },
  { method: 'GET', path: '/api/v1/patient/timeline-results', handle: handlePatientTimelineResults, auth: true },
  { method: 'GET', path: '/api/v1/patient/timeline-alerts', handle: handlePatientTimelineAlerts, auth: true },
];
