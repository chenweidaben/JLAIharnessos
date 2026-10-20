/**
 * 健澜科技 jlmedaios - M438 护理执行域深度（nursing）
 *
 * 护理记录/护理评分/医嘱执行/交班记录/消毒隔离/皮肤护理
 * 聚焦护理执行环节（区别于 M429 /nqi/* 护理质量敏感指标口径）。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/nursing/notes-detail - 护理记录（患者/班次/护理措施/评估/记录护士/时间）5 条 */
async function handleNurNotes(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NNT-001', patient: '患者：张***（男，65 岁，心内科 3 床）', shift: '班次：白班（08:00-16:00）', measure: '护理措施：协助晨间洗漱、监测心率血压、协助床上活动', assessment: '评估：神志清，心率 72 次/分，血压 128/76mmHg，无胸闷', nurse: '记录护士：李***（工号 N-018）', time: '时间：2026-10-20 09:20:14' },
    { id: 'NNT-002', patient: '患者：李***（女，58 岁，内分泌科 12 床）', shift: '班次：白班', measure: '护理措施：注射餐前胰岛素、监测空腹及餐后血糖、糖尿病饮食指导', assessment: '评估：空腹血糖 7.2mmol/L，注射部位无硬结，饮食配合', nurse: '记录护士：王***（工号 N-022）', time: '时间：2026-10-20 10:05:40' },
    { id: 'NNT-003', patient: '患者：王***（男，72 岁，骨科 6 床术后）', shift: '班次：夜班（22:00-08:00）', measure: '护理措施：术后伤口观察、镇痛评估、下肢功能锻炼指导、协助翻身', assessment: '评估：伤口敷料干燥，VAS 疼痛 2 分，末梢血运良好', nurse: '记录护士：赵***（工号 N-031）', time: '时间：2026-10-20 02:30:08' },
    { id: 'NNT-004', patient: '患者：陈***（男，45 岁，普外科 8 床）', shift: '班次：中班（16:00-24:00）', measure: '护理措施：术后排气情况观察、引流管护理、下床活动协助', assessment: '评估：已排气，引流量 80ml，切口无渗液，食欲恢复', nurse: '记录护士：孙***（工号 N-009）', time: '时间：2026-10-20 17:40:55' },
    { id: 'NNT-005', patient: '患者：赵***（女，32 岁，妇产科 5 床产后）', shift: '班次：白班', measure: '护理措施：子宫复旧观察、会阴护理、母乳喂养指导、新生儿早接触', assessment: '评估：宫底脐下 2 指，恶露正常，泌乳初现，母婴接触良好', nurse: '记录护士：周***（工号 N-027）', time: '时间：2026-10-20 11:15:33' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nursing/scores-detail - 护理评分（患者/评分项/得分/等级/评估时间）5 条 */
async function handleNurScores(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NSC-001', patient: '患者：王***（男，72 岁，骨科术后卧床）', scale: '评分项：Braden 压疮风险评估（6 维度）', score: '得分：14 分', grade: '等级：中度风险（15-18 轻度/13-14 中度/≤12 高危）', evalTime: '评估时间：2026-10-20 08:40（每班复评）' },
    { id: 'NSC-002', patient: '患者：张***（男，65 岁，心内科老年）', scale: '评分项：Morse 跌倒风险评估（6 项）', score: '得分：45 分', grade: '等级：中风险（0-24 低/25-44 中/≥45 高）', evalTime: '评估时间：2026-10-20 09:00（入院+每班复评）' },
    { id: 'NSC-003', patient: '患者：李***（女，58 岁，糖尿病）', scale: '评分项：Braden 压疮评估', score: '得分：19 分', grade: '等级：低风险', evalTime: '评估时间：2026-10-20 10:20' },
    { id: 'NSC-004', patient: '患者：陈***（男，45 岁，普外科术后）', scale: '评分项：NRS 营养风险筛查（NRS2002）', score: '得分：3 分', grade: '等级：存在营养风险（≥3 分需营养支持）', evalTime: '评估时间：2026-10-20 16:10' },
    { id: 'NSC-005', patient: '患者：赵***（女，32 岁，产后）', scale: '评分项：产后抑郁筛查 EPDS（爱丁堡）', score: '得分：6 分', grade: '等级：正常（0-9 正常，10-12 关注，≥13 需干预）', evalTime: '评估时间：2026-10-20 11:30（产后 24h）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nursing/med-admin - 医嘱执行（医嘱号/患者/药品/执行护士/时间/结果）5 条 */
async function handleNurMedAdmin(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NMA-001', orderNo: '医嘱号：ORD-20261020-0301（皮下注射）', patient: '患者：李***（女，58 岁，内分泌科）', drug: '药品：门冬胰岛素 8U（餐前 15 分钟皮下注射）', nurse: '执行护士：王***（N-022）', time: '时间：2026-10-20 11:15:00（餐前准时执行）', result: '结果：执行成功，已扫码核对，注射部位轮换' },
    { id: 'NMA-002', orderNo: '医嘱号：ORD-20261020-0302（静脉滴注）', patient: '患者：王***（男，72 岁，骨科）', drug: '药品：头孢唑林钠 2g 静滴 q8h（术后预防感染）', nurse: '执行护士：赵***（N-031）', time: '时间：2026-10-20 10:00:20', result: '结果：执行成功，输液通畅，无不良反应' },
    { id: 'NMA-003', orderNo: '医嘱号：ORD-20261020-0303（口服给药）', patient: '患者：张***（男，65 岁，心内科）', drug: '药品：阿司匹林肠溶片 100mg 口服（晨起）', nurse: '执行护士：李***（N-018）', time: '时间：2026-10-20 08:05:12', result: '结果：执行成功，看服到口' },
    { id: 'NMA-004', orderNo: '医嘱号：ORD-20261020-0304（雾化吸入）', patient: '患者：陈***（男，45 岁，普外科术后痰多）', drug: '药品：氨溴索雾化液 15mg 雾化吸入 bid', nurse: '执行护士：孙***（N-009）', time: '时间：2026-10-20 09:30:45', result: '结果：执行成功，雾化后排痰有效' },
    { id: 'NMA-005', orderNo: '医嘱号：ORD-20261020-0305（外用）', patient: '患者：赵***（女，32 岁，产后会阴）', drug: '药品：会阴冲洗护理（外用，每日 2 次）', nurse: '执行护士：周***（N-027）', time: '时间：2026-10-20 12:00:18', result: '结果：执行成功，会阴清洁干燥，无红肿' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nursing/handovers - 交班记录（班次/交班人/接班人/重点患者/注意事项）5 条 */
async function handleNurHandovers(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NHO-001', shift: '班次：白班 → 中班（16:00 交班）', from: '交班人：李***（N-018）', to: '接班人：孙***（N-009）', focus: '重点患者：3 床张***（心率偏快需夜间监测）、12 床李***（血糖波动）', note: '注意事项：12 床餐前胰岛素务必按时注射，留意夜间低血糖' },
    { id: 'NHO-002', shift: '班次：中班 → 夜班（22:00 交班）', from: '交班人：孙***（N-009）', to: '接班人：赵***（N-031）', focus: '重点患者：6 床王***（术后镇痛，夜间留意伤口渗血）、8 床陈***（引流管勿滑脱）', note: '注意事项：6 床 VAS 升高及时报医生，记录引流量' },
    { id: 'NHO-003', shift: '班次：夜班 → 白班（08:00 交班）', from: '交班人：赵***（N-031）', to: '接班人：王***（N-022）', focus: '重点患者：12 床李***（今晨空腹血糖待监测）、3 床张***（晨起血压复测）', note: '注意事项：夜间无病情变化，重点跟踪两位慢病患者指标' },
    { id: 'NHO-004', shift: '班次：白班 → 中班（16:00 交班，妇产科）', from: '交班人：周***（N-027）', to: '接班人：陈***（N-015）', focus: '重点患者：5 床赵***（产后恶露观察）、新生儿黄疸监测', note: '注意事项：指导母乳喂养，关注新生儿体温与喂养' },
    { id: 'NHO-005', shift: '班次：中班 → 夜班（22:00 交班，心内科）', from: '交班人：李***（N-018）', to: '接班人：钱***（N-033）', focus: '重点患者：3 床张***（夜间心电监护，留意心率/ST 段）', note: '注意事项：夜间如胸闷发作立即报值班医生并做心电图' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nursing/infection-control - 消毒隔离（患者/隔离类型/防护措施/执行人/状态）5 条 */
async function handleNurInfectionControl(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NIC-001', patient: '患者：刘***（男，55 岁，开放性肺结核）', isolateType: '隔离类型：呼吸道隔离（单间，负压通风）', measure: '防护措施：N95 口罩+隔离衣，病房每日紫外线+含氯消毒，陪护限员', executor: '执行人：王***（N-022）', status: '状态：隔离执行中（专管床旁，专人护理）' },
    { id: 'NIC-002', patient: '患者：孙***（女，48 岁，多重耐药菌 MRSA 定植）', isolateType: '隔离类型：接触隔离（床边隔离，专用器具）', measure: '防护措施：手套+隔离衣，器械专人专用，终末消毒，物品专用', executor: '执行人：赵***（N-031）', status: '状态：隔离执行中（解除需连续培养阴性）' },
    { id: 'NIC-003', patient: '患者：周***（女，6 岁，手足口病）', isolateType: '隔离类型：消化道+接触隔离（儿童病区单间）', measure: '防护措施：手卫生+手套，排泄物消毒，玩具/餐具专人专用', executor: '执行人：陈***（N-015）', status: '状态：隔离执行中' },
    { id: 'NIC-004', patient: '患者：吴***（男，62 岁，术后切口感染）', isolateType: '隔离类型：接触隔离（伤口分泌物 MRSA）', measure: '防护措施：换药戴手套口罩，污染敷料双层封装，房间通风消毒', executor: '执行人：孙***（N-009）', status: '状态：隔离执行中（已报院感科）' },
    { id: 'NIC-005', patient: '患者：郑***（女，30 岁，甲型流感恢复期）', isolateType: '隔离类型：呼吸道隔离（轻症居家/单间，已解除观察）', measure: '防护措施：解除隔离前戴外科口罩，病区通风，密切接触者筛查', executor: '执行人：李***（N-018）', status: '状态：已解除隔离（连续 48h 退热、症状缓解）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nursing/skin-care - 皮肤护理（患者/部位/压疮分期/护理措施/复查时间）5 条 */
async function handleNurSkinCare(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NSK-001', patient: '患者：王***（男，72 岁，骨科术后卧床）', site: '部位：骶尾部（受压部位）', stage: '压疮分期：Ⅰ 期（皮肤完整，红斑未破，不可褪色）', measure: '护理措施：q2h 翻身减压、软垫支撑、保持干燥、皮肤按摩（避开红斑区）', recheck: '复查时间：2026-10-21 08:00（每日评估红斑变化）' },
    { id: 'NSK-002', patient: '患者：张***（男，65 岁，心内科卧床）', site: '部位：足跟（双下肢制动处）', stage: '压疮分期：无损伤（皮肤完整，预防性减压）', measure: '护理措施：足跟悬空垫软枕、避免受压，观察皮肤颜色', recheck: '复查时间：2026-10-20 16:00（每班查看）' },
    { id: 'NSK-003', patient: '患者：陈***（男，45 岁，普外科术后消瘦）', site: '部位：肩胛骨/尾骶骨（骨突处）', stage: '压疮分期：Ⅰ 期（局部发红，轻度水肿）', measure: '护理措施：减压贴保护、定时翻身、加强营养摄入', recheck: '复查时间：2026-10-21 08:00' },
    { id: 'NSK-004', patient: '患者：李***（女，58 岁，糖尿病长期卧床风险）', site: '部位：坐骨结节（坐位受压）', stage: '压疮分期：无损伤（预防性护理）', measure: '护理措施：减压坐垫、控制坐位时长、皮肤保湿清洁', recheck: '复查时间：2026-10-21 16:00' },
    { id: 'NSK-005', patient: '患者：赵***（女，32 岁，产后长期卧床风险）', site: '部位：骶尾部（产后卧床）', stage: '压疮分期：无损伤（皮肤完整）', measure: '护理措施：定时变换体位、床单平整干燥、早期下床活动', recheck: '复查时间：2026-10-21 08:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m438Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/nursing/notes-detail', handle: handleNurNotes, auth: true },
  { method: 'GET', path: '/api/v1/nursing/scores-detail', handle: handleNurScores, auth: true },
  { method: 'GET', path: '/api/v1/nursing/med-admin', handle: handleNurMedAdmin, auth: true },
  { method: 'GET', path: '/api/v1/nursing/handovers', handle: handleNurHandovers, auth: true },
  { method: 'GET', path: '/api/v1/nursing/infection-control', handle: handleNurInfectionControl, auth: true },
  { method: 'GET', path: '/api/v1/nursing/skin-care', handle: handleNurSkinCare, auth: true },
];
