/**
 * 健澜科技 jlmedaios - M230 急诊重症手术麻醉深度
 *
 * 急诊病例详情/分诊 + ICU病例详情/监护事件 + 手术详情深度/麻醉详情深度 + 术后恢复深度
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、急诊深度 ==================== */

/** GET /api/v1/emergency/detail - 急诊病例详情 */
async function handleEmergencyDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    patient: '张演示',
    chiefComplaint: '突发胸痛 2 小时',
    diagnosis: '急性 ST 段抬高型心肌梗死（前壁）',
    resuscitation: '心电监护、吸氧、建立静脉通路、心电除颤 1 次（200J）、阿司匹林 300mg 嚼服、氯吡格雷 600mg 口服',
    treatment: '急诊 PCI（经皮冠状动脉介入治疗），前降支植入药物洗脱支架 1 枚',
    outcome: '转 ICU 监护治疗',
  }));
}

/** GET /api/v1/emergency/triage - 急诊分诊 */
async function handleEmergencyTriage(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const triage = [
    { id: 'TRI-001', patient: '张演示', level: 'I 级（濒危）', vitalSigns: '意识：清醒，呼吸：24 次/分，循环：血压 90/60 mmHg', waitTime: 0, doctor: '急诊科-李主任' },
    { id: 'TRI-002', patient: '李患者', level: 'II 级（危重）', vitalSigns: '意识：嗜睡，呼吸：30 次/分，循环：血压 160/95 mmHg', waitTime: 5, doctor: '急诊科-王医生' },
    { id: 'TRI-003', patient: '王先生', level: 'III 级（急症）', vitalSigns: '意识：清楚，呼吸：18 次/分，循环：血压 130/80 mmHg', waitTime: 20, doctor: '急诊科-张医生' },
    { id: 'TRI-004', patient: '赵女士', level: 'III 级（急症）', vitalSigns: '意识：清楚，呼吸：20 次/分，循环：血压 120/75 mmHg', waitTime: 30, doctor: '急诊科-刘医生' },
    { id: 'TRI-005', patient: '刘大爷', level: 'IV 级（非急症）', vitalSigns: '意识：清楚，呼吸：16 次/分，循环：血压 140/85 mmHg', waitTime: 45, doctor: '急诊科-陈医生' },
  ];

  return json(ok({ triage, totalCount: triage.length }));
}

/* ==================== 二、重症深度 ==================== */

/** GET /api/v1/icu/detail - ICU 病例详情 */
async function handleIcuDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    patient: '张演示',
    primaryDiagnosis: '急性心肌梗死（术后）+ 心源性休克',
    apache2: 22,
    sofa: 8,
    mechanicalVentilation: '有创机械通气（气管插管）',
    vasoactiveDrugs: '去甲肾上腺素 0.5 μg/kg/min',
    prognosis: '存活（转普通病房）',
  }));
}

/** GET /api/v1/icu/events - ICU 监护事件 */
async function handleIcuEvents(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const events = [
    { id: 'ICE-001', patient: '张演示', type: '心律失常（室性早搏）', time: '2026-10-20 02:30', action: '静脉推注利多卡因 50mg，持续心电监护', outcome: '转归：早搏减少，心率维持 80-90 bpm' },
    { id: 'ICE-002', patient: '李患者', type: '低血压（收缩压 < 80 mmHg）', time: '2026-10-20 06:15', action: '加快去甲肾上腺素泵速，补液 500ml', outcome: '转归：血压回升至 100/60 mmHg' },
    { id: 'ICE-003', patient: '王先生', type: '低氧血症（SpO2 < 90%）', time: '2026-10-20 10:45', action: '调整呼吸机参数（PEEP 5→8 cmH2O），吸痰', outcome: '转归：SpO2 回升至 95%' },
  ];

  return json(ok({ events, totalCount: events.length }));
}

/* ==================== 三、手术麻醉深度 ==================== */

/** GET /api/v1/surgery/detail-full - 手术详情（深度版） */
async function handleSurgeryDetailFull(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    patient: '张演示',
    surgeryName: '冠状动脉旁路移植术（CABG，停跳）',
    surgeon: '心外科-王主任',
    assistants: ['心外科-李医生', '心外科-张医生'],
    anesthesia: '全身麻醉（气管插管+机械通气）',
    incision: 'I 类切口（清洁手术）',
    bloodLoss: 800,
    bloodTransfusion: 400,
    intraoperativePathology: '左前降支近端 95% 狭窄，回旋支 80% 狭窄',
    surgeryTime: '2026-10-20 08:00 - 14:30（6.5 小时）',
  }));
}

/** GET /api/v1/anesthesia/detail-full - 麻醉记录详情（深度版） */
async function handleAnesthesiaDetailFull(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    patient: '张演示',
    anesthesiologist: '麻醉科-赵主任',
    drugs: [
      { name: '咪达唑仑', dosage: '2mg', time: '诱导前' },
      { name: '丙泊酚', dosage: '150mg', time: '诱导' },
      { name: '瑞芬太尼', dosage: '200μg', time: '诱导+维持' },
      { name: '顺阿曲库铵', dosage: '10mg', time: '诱导' },
      { name: '七氟烷', dosage: '1.5 MAC', time: '维持' },
    ],
    vitalSigns: {
      heartRate: { baseline: 75, min: 55, max: 95, avg: 72 },
      bloodPressure: { systolic: { baseline: 130, min: 90, max: 160, avg: 120 }, diastolic: { baseline: 80, min: 60, max: 100, avg: 75 } },
      spo2: { baseline: 99, min: 95, max: 100, avg: 98 },
    },
    bis: { baseline: 98, maintenance: '40-60', recovery: '> 80' },
    recoveryTime: '2026-10-20 15:00（术后 30 分钟拔管）',
    complications: '无明显麻醉并发症',
  }));
}

/* ==================== 四、术后恢复深度 ==================== */

/** GET /api/v1/surgery/postop-detail - 术后恢复 */
async function handleSurgeryPostopDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const postop = [
    { id: 'POD-001', patient: '张演示', surgery: 'CABG 术后', recoveryRoomStay: 120, painScore: 3, drainage: '心包纵隔引流 200ml/24h', ambulationTime: '术后第 2 天下床活动', status: '已出室（转心外科 ICU）' },
    { id: 'POD-002', patient: '李患者', surgery: '腹腔镜胆囊切除术后', recoveryRoomStay: 60, painScore: 2, drainage: '腹腔引流 50ml/24h', ambulationTime: '术后第 1 天下床活动', status: '已出室（转普通病房）' },
    { id: 'POD-003', patient: '王先生', surgery: '髋关节置换术后', recoveryRoomStay: 90, painScore: 4, drainage: '切口引流 100ml/24h', ambulationTime: '术后第 3 天借助助行器下床', status: '恢复中（留观中）' },
  ];

  return json(ok({ postop, totalCount: postop.length }));
}

export const m230Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emergency/detail', handle: handleEmergencyDetail, auth: true },
  { method: 'GET', path: '/api/v1/emergency/triage', handle: handleEmergencyTriage, auth: true },
  { method: 'GET', path: '/api/v1/icu/detail', handle: handleIcuDetail, auth: true },
  { method: 'GET', path: '/api/v1/icu/events', handle: handleIcuEvents, auth: true },
  { method: 'GET', path: '/api/v1/surgery/detail-full', handle: handleSurgeryDetailFull, auth: true },
  { method: 'GET', path: '/api/v1/anesthesia/detail-full', handle: handleAnesthesiaDetailFull, auth: true },
  { method: 'GET', path: '/api/v1/surgery/postop-detail', handle: handleSurgeryPostopDetail, auth: true },
];
