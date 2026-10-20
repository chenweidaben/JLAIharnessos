/**
 * 健澜科技 jlmedaios - M467 急诊急救与三大中心（chest/stroke/trauma/emergency）
 *
 * 胸痛中心 / 卒中中心 / 创伤中心 / 急救调度 / 救治时间窗
 * （emergency/green-channel 绿色通道已存在，此处不重复）。
 * 避开急诊主域、危急值闭环、医技预约、分诊排队既有口径。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/chest/center - 胸痛中心（病例号/发病时间/到院时间/门球时间/溶栓或PCI/状态）5 条 */
async function handleChestCenter(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CHS-001', caseNo: '病例号：CH-2026-1018-01（STEMI 急性前壁心梗）', onset: '发病时间：2026-10-18 06:12（持续胸痛 40min）', arrival: '到院时间：06:58（救护车送达急诊）', doorBalloon: '门球时间（D2B）：52 分钟（达标 ≤90min）', therapy: '溶栓/PCI：急诊 PCI（导管室开通，植入支架 1 枚）', status: '状态：术后 CCU 监护，病情稳定' },
    { id: 'CHS-002', caseNo: '病例号：CH-2026-1015-03（NSTEMI 非 ST 段抬高心梗）', onset: '发病时间：2026-10-15 21:40（夜间发作）', arrival: '到院时间：22:26（自行到院）', doorBalloon: '门球时间：药物保守治疗 + 择期造影（无急诊 D2B）', therapy: '溶栓/PCI：抗栓强化，择期冠脉造影', status: '状态：住院观察，拟择期介入' },
    { id: 'CHS-003', caseNo: '病例号：CH-2026-1012-02（不稳定心绞痛）', onset: '发病时间：2026-10-12 14:05（反复胸痛）', arrival: '到院时间：14:31（门诊转入）', doorBalloon: '门球时间：非急诊介入（评估药物治疗）', therapy: '溶栓/PCI：造影提示多支病变，药物+方案讨论', status: '状态：心内科住院，制定血运重建计划' },
    { id: 'CHS-004', caseNo: '病例号：CH-2026-1009-01（STEMI 下壁心梗）', onset: '发病时间：2026-10-09 03:20（凌晨）', arrival: '到院时间：04:05（120 送达）', doorBalloon: '门球时间：68 分钟（达标）', therapy: '溶栓/PCI：先溶栓（转运距导管室远）后转 PCI', status: '状态：溶栓成功，转院 PCI 后恢复良好' },
    { id: 'CHS-005', caseNo: '病例号：CH-2026-1005-04（主动脉夹层鉴别，非心梗）', onset: '发病时间：2026-10-05 19:30（撕裂样背痛）', arrival: '到院时间：19:55（急诊）', doorBalloon: '门球时间：排除心梗（主动脉 CTA 确诊夹层）', therapy: '溶栓/PCI：禁溶栓，转血管外科/心外科处置', status: '状态：按夹层路径转专科（胸痛鉴别排除）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/stroke/center - 卒中中心（病例号/发病时间/NIHSS评分/取栓或溶栓/DNT时间/转归）5 条 */
async function handleStrokeCenter(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'STR-001', caseNo: '病例号：ST-2026-1017-01（急性大血管闭塞，醒后卒中）', onset: '发病时间：2026-10-17 07:30（醒后发现，最后正常 22:00）', nihss: 'NIHSS 评分：14 分（中度偏重）', therapy: '取栓/溶栓：静脉溶栓 + 机械取栓（CTP 评估后）', dnt: 'DNT 时间（到院-给药）：35 分钟（达标 ≤60min）', outcome: '转归：24h NIHSS 降至 5 分，良好恢复中' },
    { id: 'STR-002', caseNo: '病例号：ST-2026-1014-02（急性缺血性脑梗，醒内）', onset: '发病时间：2026-10-14 09:10（明确发病 1h）', nihss: 'NIHSS 评分：6 分（轻度）', therapy: '取栓/溶栓：静脉溶栓（无大血管闭塞）', dnt: 'DNT 时间：28 分钟（达标）', outcome: '转归：溶栓后症状明显改善，NIHSS 2 分' },
    { id: 'STR-003', caseNo: '病例号：ST-2026-1011-03（脑出血，非缺血）', onset: '发病时间：2026-10-11 16:20（活动中突发）', nihss: 'NIHSS 评分：11 分（出血性，按血肿评估）', therapy: '取栓/溶栓：禁溶栓，神经外科保守/手术评估', dnt: 'DNT 时间：不适用（排除溶栓，按脑出血路径）', outcome: '转归：收住神外监护，血肿稳定' },
    { id: 'STR-004', caseNo: '病例号：ST-2026-1008-01（大血管闭塞，直接取栓）', onset: '发病时间：2026-10-08 02:15（夜间发病）', nihss: 'NIHSS 评分：18 分（重度）', therapy: '取栓/溶栓：直接机械取栓（时间窗内）', dnt: 'DNT 时间：到院-股动脉穿刺 70 分钟', outcome: '转归：血管再通，3 月随访 mRS 2 分（独立生活）' },
    { id: 'STR-005', caseNo: '病例号：ST-2026-1002-04（短暂性脑缺血 TIA）', onset: '发病时间：2026-10-02 11:40（一过性肢体无力 15min 缓解）', nihss: 'NIHSS 评分：0 分（发作后完全缓解）', therapy: '取栓/溶栓：不溶栓，二级预防 + 血管评估', dnt: 'DNT 时间：不适用（TIA 短暂发作）', outcome: '转归：住院排查病因，抗血小板 + 危险因素管理' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/trauma/center - 创伤中心（病例号/ISS评分/受伤机制/抢救措施/绿色通道/转归）5 条 */
async function handleTraumaCenter(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TRM-001', caseNo: '病例号：TM-2026-1016-01（车祸多发伤）', iss: 'ISS 评分：25 分（重伤，≥16）', mechanism: '受伤机制：小轿车碰撞，胸部+下肢多发伤', rescue: '抢救措施：止血/液体复苏/气管插管保护气道，CT 一条龙', green: '绿色通道：激活创伤团队（创伤Ⅰ级响应， bypass 候诊）', outcome: '转归：急诊手术止血，ICU 稳定后转普通病房' },
    { id: 'TRM-002', caseNo: '病例号：TM-2026-1013-02（高处坠落伤）', iss: 'ISS 评分：18 分（重伤）', mechanism: '受伤机制：2 米坠落，骨盆+脊柱损伤', rescue: '抢救措施：脊柱固定、骨盆带、抗休克、监测', green: '绿色通道：创伤Ⅱ级响应，多学科会诊', outcome: '转归：骨科手术固定，神经功能保全良好' },
    { id: 'TRM-003', caseNo: '病例号：TM-2026-1010-03（锐器刺伤腹部）', iss: 'ISS 评分：16 分', mechanism: '受伤机制：腹部刀刺伤（开放性损伤）', rescue: '抢救措施：剖腹探查止血、脏器修补、输血', green: '绿色通道：直接进手术室（Ⅰ级响应）', outcome: '转归：术后恢复顺利，无腹腔并发症' },
    { id: 'TRM-004', caseNo: '病例号：TM-2026-1007-04（摔伤，轻度闭合伤）', iss: 'ISS 评分：6 分（轻伤，<9）', mechanism: '受伤机制：雨天滑倒，腕部骨折 + 软组织挫伤', rescue: '抢救措施：复位固定、止痛、拍片', green: '绿色通道：普通创伤流程（未激活高级响应）', outcome: '转归：骨科石膏固定，门诊随访' },
    { id: 'TRM-005', caseNo: '病例号：TM-2026-1004-01（交通伤合并颅脑损伤）', iss: 'ISS 评分：32 分（极重伤）', mechanism: '受伤机制：摩托车事故，脑挫伤+胸腔积液', rescue: '抢救措施：气道管理、颅内压监测、胸腔闭式引流、大量输血', green: '绿色通道：创伤Ⅰ级，神经外科+胸外科联合', outcome: '转归：经抢救生命体征平稳，神外监护中（重点病例跟踪）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emergency/dispatch - 急救调度（呼救号/出车时间/到达时间/接回人数/车辆/状态）5 条 */
async function handleEmDispatch(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DSP-001', callNo: '呼救号：120-20261018-217（胸痛呼叫）', depart: '出车时间：06:45（接单 1 分钟内出车）', arrive: '到达现场时间：06:52（7 分钟，城区达标）', carried: '接回人数：1 人（心梗患者，含 1 名陪同家属）', vehicle: '车辆：急救车 1 号（心电监护+除颤设备）', status: '状态：已送达急诊，任务闭环（交接记录完整）' },
    { id: 'DSP-002', callNo: '呼救号：120-20261017-093（卒中呼叫）', depart: '出车时间：07:42', arrive: '到达现场时间：07:58（郊区 16 分钟）', carried: '接回人数：1 人（醒后卒中患者）', vehicle: '车辆：急救车 3 号（溶栓携行药箱）', status: '状态：已送达卒中中心，闭环' },
    { id: 'DSP-003', callNo: '呼救号：120-20261016-331（车祸多发伤）', depart: '出车时间：14:02（事故多发点，同步通报创伤中心）', arrive: '到达现场时间：14:14（12 分钟）', carried: '接回人数：1 人（另有现场伤员由他车接驳）', vehicle: '车辆：急救车 2 号（创伤抢救装备）', status: '状态：已送达创伤中心，闭环' },
    { id: 'DSP-004', callNo: '呼救号：120-20261012-156（跌倒老人）', depart: '出车时间：21:08', arrive: '到达现场时间：21:19（11 分钟，小区内）', carried: '接回人数：1 人（跌倒扭伤，步行可协助）', vehicle: '车辆：急救车 4 号', status: '状态：已送达急诊，闭环（家属陪同）' },
    { id: 'DSP-005', callNo: '呼救号：120-20261009-074（凌晨心梗转运）', depart: '出车时间：03:28（跨区转运请求）', arrive: '到达现场时间：04:01（跨区 33 分钟）', carried: '接回人数：1 人（基层转诊 STEMI）', vehicle: '车辆：急救车 1 号（溶栓/监护）', status: '状态：送达后衔接胸痛 PCI，闭环' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emergency/time-window - 救治时间窗（病种/黄金时间/各环节时限/实际耗时/是否达标）5 条 */
async function handleEmTimeWindow(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TWD-001', disease: '病种：STEMI 急性心梗（急诊 PCI）', golden: '黄金时间：发病 12h 内开通梗死血管（门球 ≤90min）', stages: '各环节时限：到院-心电图 ≤10min，D2B ≤90min', actual: '实际耗时：D2B 52min（本次 CHS-001）', pass: '是否达标：达标（在限定时间内完成再灌注）' },
    { id: 'TWD-002', disease: '病种：急性缺血性卒中（静脉溶栓）', golden: '黄金时间：发病 4.5h 内（醒后需影像评估）', stages: '各环节时限：DNT ≤60min，到院-CT ≤25min', actual: '实际耗时：DNT 35min（本次 STR-001）', pass: '是否达标：达标（流程时限内给药）' },
    { id: 'TWD-003', disease: '病种：大血管闭塞（机械取栓）', golden: '黄金时间：发病 6h 内（部分延长至 24h 经影像筛选）', stages: '各环节时限：到院-穿刺 ≤90min（绿色通道优先）', actual: '实际耗时：到院-穿刺 70min（STR-004）', pass: '是否达标：达标（时间窗内再通）' },
    { id: 'TWD-004', disease: '病种：严重创伤（黄金 1 小时）', golden: '黄金时间：伤后 60min 内完成关键处置（白金 10min 评估）', stages: '各环节时限：预检评估 ≤10min，复苏/手术时限分级', actual: '实际耗时：创伤团队 8min 到位（TRM-001）', pass: '是否达标：达标（Ⅰ级响应快速激活）' },
    { id: 'TWD-005', disease: '病种：心搏骤停（CPR 黄金 4 分钟）', golden: '黄金时间：骤停 4min 内开始有效 CPR（每延迟 1min 存活率降 10%）', stages: '各环节时限：目击者识别-呼救-AED/除颤即刻启动', actual: '实际耗时：本批无骤停案例，按预案演练记录（3min 内除颤目标）', pass: '是否达标：演练达标（预案常备，待实战检验）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m467Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/chest/center', handle: handleChestCenter, auth: true },
  { method: 'GET', path: '/api/v1/stroke/center', handle: handleStrokeCenter, auth: true },
  { method: 'GET', path: '/api/v1/trauma/center', handle: handleTraumaCenter, auth: true },
  { method: 'GET', path: '/api/v1/emergency/dispatch', handle: handleEmDispatch, auth: true },
  { method: 'GET', path: '/api/v1/emergency/time-window', handle: handleEmTimeWindow, auth: true },
];
