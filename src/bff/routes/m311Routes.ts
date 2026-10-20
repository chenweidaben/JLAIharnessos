/**
 * 健澜科技 jlmedaios - M311 急诊急救域
 *
 * 急救记录/救护车调度/中毒救治/创伤救治/危重症
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/emergency/rescue - 急救记录 5 条 */
async function handleEmergencyRescue(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ER-001', rescueNo: 'JR-20261020-001', patient: '王***（男，65 岁）', condition: '急性心梗（胸痛 2 小时）', treatment: '立即心电图+阿司匹林 300mg 嚼服+硝酸甘油含服', result: '急诊 PCI 术后转入 CCU' },
    { id: 'ER-002', rescueNo: 'JR-20261020-002', patient: '李***（女，45 岁）', condition: '脑出血（突发头痛呕吐 30 分钟）', treatment: '头颅 CT 确诊+甘露醇脱水+控制血压', result: '神经外科会诊后保守治疗' },
    { id: 'ER-003', rescueNo: 'JR-20261019-003', patient: '张***（男，32 岁）', condition: '严重车祸多发伤（失血性休克）', treatment: '立即液体复苏+止血+输血', result: '急诊手术后转入 ICU' },
    { id: 'ER-004', rescueNo: 'JR-20261019-004', patient: '赵***（女，28 岁）', condition: '过敏性休克（蜂蜇伤）', treatment: '立即肾上腺素 0.5mg 肌注+糖皮质激素', result: '生命体征平稳，留观 24h 后离院' },
    { id: 'ER-005', rescueNo: 'JR-20261018-005', patient: '孙***（男，70 岁）', condition: '急性脑卒中（脑梗，发病 3 小时）', treatment: '阿替普酶静脉溶栓', result: '溶栓后症状改善，转入神经内科病房' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emergency/ambulance - 救护车调度 5 条 */
async function handleEmergencyAmbulance(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EA-001', ambulanceNo: '浙 A·12001', mission: '胸痛患者转运（社区→本院）', departTime: '2026-10-20 08:30', arriveTime: '2026-10-20 08:45', status: '已完成' },
    { id: 'EA-002', ambulanceNo: '浙 A·12002', mission: '严重车祸现场急救转运', departTime: '2026-10-20 10:15', arriveTime: '2026-10-20 10:40', status: '已完成' },
    { id: 'EA-003', ambulanceNo: '浙 A·12003', mission: '脑卒中患者转运（县级医院→本院卒中中心）', departTime: '2026-10-19 14:00', arriveTime: '2026-10-19 14:50', status: '已完成' },
    { id: 'EA-004', ambulanceNo: '浙 A·12004', mission: '过敏性休克患者现场急救', departTime: '2026-10-19 16:30', arriveTime: '2026-10-19 16:40', status: '已完成' },
    { id: 'EA-005', ambulanceNo: '浙 A·12005', mission: '重症监护室转运（本院→上级医院）', departTime: '2026-10-21 09:00', arriveTime: '—', status: '执行中' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emergency/poisoning - 中毒救治 5 条 */
async function handleEmergencyPoisoning(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EP-001', patient: '张***（男，45 岁）', poison: '有机磷农药（口服约 100ml）', dose: '口服约 100ml（敌敌畏）', treatment: '立即清水洗胃+阿托品+氯解磷定+血液灌流', result: '病情稳定，转入 EICU 观察' },
    { id: 'EP-002', patient: '李***（女，28 岁）', poison: '安眠药（地西泮过量约 50 片）', dose: '约 500mg 地西泮', treatment: '清水洗胃+氟马西尼+对症支持治疗', result: '意识恢复，留观后离院' },
    { id: 'EP-003', patient: '王***（男，60 岁）', poison: '一氧化碳中毒（煤气泄漏）', dose: '密闭空间暴露约 2 小时', treatment: '立即脱离现场+高流量吸氧+高压氧舱治疗', result: '意识恢复，继续高压氧治疗' },
    { id: 'EP-004', patient: '赵***（女，35 岁）', poison: '毒蘑菇（自采误食）', dose: '约 200g（野生毒蘑菇）', treatment: '洗胃+活性炭吸附+保肝+血液净化', result: '肝功能恢复中，转入消化科' },
    { id: 'EP-005', patient: '孙***（男，18 岁）', poison: '酒精中毒（白酒约 1 斤）', dose: '约 250ml 52 度白酒', treatment: '清醒催吐+补液+维生素 B1+纳洛酮', result: '清醒后离院' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emergency/trauma - 创伤救治 5 条 */
async function handleEmergencyTrauma(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ET-001', patient: '张***（男，32 岁）', traumaSite: '头部+胸部+腹部（多发伤）', severity: '重伤（ISS 评分 35 分）', treatment: '急诊剖腹探查+胸腔闭式引流+神经外科会诊', result: '手术后转入 ICU' },
    { id: 'ET-002', patient: '李***（男，55 岁）', traumaSite: '右下肢（车祸骨折）', severity: '中度伤（ISS 评分 15 分）', treatment: '右胫骨骨折切开复位内固定术', result: '手术后转入骨科病房' },
    { id: 'ET-003', patient: '王***（女，25 岁）', traumaSite: '面部+上肢（摔倒擦伤）', severity: '轻伤（ISS 评分 4 分）', treatment: '清创缝合+破伤风抗毒素', result: '缝合后离院，门诊换药' },
    { id: 'ET-004', patient: '赵***（男，40 岁）', traumaSite: '胸部（刀刺伤）', severity: '重伤（ISS 评分 25 分）', treatment: '急诊开胸探查+肺修补术', result: '手术后转入心胸外科 ICU' },
    { id: 'ET-005', patient: '孙***（男，68 岁）', traumaSite: '髋部（摔倒股骨颈骨折）', severity: '中度伤（ISS 评分 12 分）', treatment: '人工股骨头置换术', result: '手术后转入骨科病房' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emergency/critical - 危重症 5 条 */
async function handleEmergencyCritical(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EC-001', patient: '王***（男，65 岁）', diagnosis: '急性心梗合并心源性休克', condition: '血压 80/50mmHg，心率 110 次/分，尿量减少', monitoring: '有创动脉压+中心静脉压+呼吸机辅助呼吸+IABP', doctor: '急诊科 刘***主任医师' },
    { id: 'EC-002', patient: '李***（女，45 岁）', diagnosis: '脑出血（基底节区，约 40ml）', condition: '昏迷（GCS 8 分），左侧瞳孔散大', monitoring: '颅内压监测+气管插管+呼吸机辅助+脱水降颅压', doctor: '神经外科 王***副主任医师' },
    { id: 'EC-003', patient: '张***（男，32 岁）', diagnosis: '多发伤合并 ARDS', condition: '呼吸衰竭（SpO2 85%），血压偏低', monitoring: '呼吸机辅助呼吸（PEEP 10cmH2O）+血流动力学监测', doctor: 'ICU 陈***主任医师' },
    { id: 'EC-004', patient: '赵***（女，28 岁）', diagnosis: '过敏性休克（已纠正）', condition: '血压 100/60mmHg，心率 90 次/分，呼吸平稳', monitoring: '持续心电监护+吸氧+静脉通路', doctor: '急诊科 周***主治医师' },
    { id: 'EC-005', patient: '孙***（男，70 岁）', diagnosis: '急性脑梗死后溶栓后', condition: '意识转清，右侧肢体肌力 III 级', monitoring: '持续心电监护+血压控制+神经功能评估', doctor: '神经内科 张***副主任医师' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m311Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emergency/rescue', handle: handleEmergencyRescue, auth: true },
  { method: 'GET', path: '/api/v1/emergency/ambulance', handle: handleEmergencyAmbulance, auth: true },
  { method: 'GET', path: '/api/v1/emergency/poisoning', handle: handleEmergencyPoisoning, auth: true },
  { method: 'GET', path: '/api/v1/emergency/trauma', handle: handleEmergencyTrauma, auth: true },
  { method: 'GET', path: '/api/v1/emergency/critical', handle: handleEmergencyCritical, auth: true },
];
