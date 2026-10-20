/**
 * 健澜科技 jlmedaios - M207 急诊 + 输血 + 营养管理域
 *
 * 急诊就诊/绿色通道/抢救 + 输血申请/配血/反应 + 营养评估/膳食医嘱
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、急诊管理 ==================== */

/** GET /api/v1/emergency/visits - 急诊就诊列表 */
async function handleEmergencyVisits(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const visits = [
    { id: 'EM-001', patient: '张演示', complaint: '胸痛2小时', triage: 'I级濒危', time: '2026-10-20 08:30', status: '就诊中', observationBed: '抢救1床' },
    { id: 'EM-002', patient: '李患者', complaint: '腹痛6小时', triage: 'II级危重', time: '2026-10-20 08:45', status: '留观', observationBed: '留观3床' },
    { id: 'EM-003', patient: '王患者', complaint: '发热咳嗽3天', triage: 'III级急症', time: '2026-10-20 09:00', status: '候诊', observationBed: null },
    { id: 'EM-004', patient: '赵患者', complaint: '头晕乏力1周', triage: 'IV级非急症', time: '2026-10-20 09:15', status: '离院', observationBed: null },
    { id: 'EM-005', patient: '刘患者', complaint: '外伤后右膝疼痛2小时', triage: 'III级急症', time: '2026-10-20 09:30', status: '入院', observationBed: null },
  ];

  return json(ok({ visits, totalCount: visits.length }));
}

/** GET /api/v1/emergency/green-channel - 绿色通道记录 */
async function handleEmergencyGreenChannel(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const channels = [
    { id: 'GC-001', startTime: '2026-10-20 08:35', category: '急性心梗', patient: '张演示', result: '成功 PCI 手术', totalMinutes: 45 },
    { id: 'GC-002', startTime: '2026-10-19 14:20', category: '脑卒中', patient: '陈先生', result: '静脉溶栓成功', totalMinutes: 60 },
    { id: 'GC-003', startTime: '2026-10-18 22:10', category: '严重创伤', patient: '周先生', result: '转 ICU', totalMinutes: 30 },
  ];

  return json(ok({ channels, totalCount: channels.length }));
}

/** GET /api/v1/emergency/resuscitation - 抢救记录 */
async function handleEmergencyResuscitation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const records = [
    { id: 'RES-001', patient: '张演示', startTime: '2026-10-20 08:30', endTime: '2026-10-20 09:15', staff: ['急诊-王主任', '急诊-李医生', '护士-小张'], result: '成功', apacheScore: 18 },
    { id: 'RES-002', patient: '李先生', startTime: '2026-10-19 03:00', endTime: '2026-10-19 04:30', staff: ['急诊-刘医生', '护士-小王'], result: '转ICU', apacheScore: 25 },
    { id: 'RES-003', patient: '王先生', startTime: '2026-10-18 12:00', endTime: '2026-10-18 12:45', staff: ['急诊-陈医生', '护士-小李'], result: '死亡', apacheScore: 35 },
  ];

  return json(ok({ records, totalCount: records.length }));
}

/* ==================== 二、输血管理 ==================== */

/** GET /api/v1/blood/requests - 输血申请 */
async function handleBloodRequests(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const requests = [
    { id: 'BL-001', patient: '张演示', bloodType: 'A型 Rh阳性', volume: 400, reason: '手术（冠脉搭桥）', status: '已发血' },
    { id: 'BL-002', patient: '李患者', bloodType: 'O型 Rh阳性', volume: 200, reason: '贫血（Hb 70g/L）', status: '已输血' },
    { id: 'BL-003', patient: '王患者', bloodType: 'B型 Rh阴性', volume: 600, reason: '出血（消化道大出血）', status: '待审批' },
    { id: 'BL-004', patient: '赵患者', bloodType: 'AB型 Rh阳性', volume: 300, reason: '手术（髋关节置换）', status: '已审批' },
    { id: 'BL-005', patient: '刘患者', bloodType: 'A型 Rh阳性', volume: 400, reason: '贫血（慢性肾病）', status: '待审批' },
  ];

  return json(ok({ requests, totalCount: requests.length }));
}

/** GET /api/v1/blood/crossmatch - 配血记录 */
async function handleBloodCrossmatch(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const records = [
    { id: 'CM-001', patient: '张演示', donorBloodType: 'A型 Rh阳性', result: '相合', issueTime: '2026-10-20 09:00' },
    { id: 'CM-002', patient: '李患者', donorBloodType: 'O型 Rh阳性', result: '相合', issueTime: '2026-10-20 10:30' },
    { id: 'CM-003', patient: '王患者', donorBloodType: 'B型 Rh阴性', result: '不相合', issueTime: null },
  ];

  return json(ok({ records, totalCount: records.length }));
}

/** GET /api/v1/blood/transfusion-reactions - 输血反应记录 */
async function handleBloodReactions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const reactions = [
    { id: 'TR-001', patient: '赵患者', type: '发热', action: '立即停止输血，物理降温，给予地塞米松', outcome: '好转' },
    { id: 'TR-002', patient: '刘患者', type: '过敏', action: '停止输血，给予肾上腺素，吸氧', outcome: '好转' },
  ];

  return json(ok({ reactions, totalCount: reactions.length }));
}

/* ==================== 三、营养管理 ==================== */

/** GET /api/v1/nutrition/assessments - 营养评估 */
async function handleNutritionAssessments(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const assessments = [
    { id: 'NA-001', patient: '张演示', tool: 'NRS2002', bmi: 22.5, albumin: 38, riskScore: 3, recommendation: '正常饮食' },
    { id: 'NA-002', patient: '李患者', tool: 'NRS2002', bmi: 18.2, albumin: 32, riskScore: 5, recommendation: '肠内营养（ONS）' },
    { id: 'NA-003', patient: '王患者', tool: 'MUST', bmi: 26.8, albumin: 40, riskScore: 1, recommendation: '正常饮食' },
    { id: 'NA-004', patient: '赵患者', tool: 'SGA', bmi: 19.5, albumin: 28, riskScore: 6, recommendation: '肠外营养（TPN）' },
    { id: 'NA-005', patient: '刘患者', tool: 'NRS2002', bmi: 24.0, albumin: 35, riskScore: 2, recommendation: '正常饮食' },
  ];

  return json(ok({ assessments, totalCount: assessments.length }));
}

/** GET /api/v1/nutrition/orders - 膳食医嘱列表 */
async function handleNutritionOrders(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const orders = [
    { id: 'NO-001', patient: '张演示', dietType: '普食', therapeutic: '低盐<5g/d', allergy: '无', special: '无' },
    { id: 'NO-002', patient: '李患者', dietType: '半流质', therapeutic: '糖尿病餐', allergy: '海鲜过敏', special: '无' },
    { id: 'NO-003', patient: '王患者', dietType: '软食', therapeutic: '低脂', allergy: '无', special: '咀嚼困难' },
    { id: 'NO-004', patient: '赵患者', dietType: '流质', therapeutic: '高蛋白', allergy: '牛奶过敏', special: '吞咽困难（鼻饲）' },
    { id: 'NO-005', patient: '刘患者', dietType: '普食', therapeutic: '低蛋白（肾病）', allergy: '无', special: '无' },
  ];

  return json(ok({ orders, totalCount: orders.length }));
}

export const m207Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emergency/visits', handle: handleEmergencyVisits, auth: true },
  { method: 'GET', path: '/api/v1/emergency/green-channel', handle: handleEmergencyGreenChannel, auth: true },
  { method: 'GET', path: '/api/v1/emergency/resuscitation', handle: handleEmergencyResuscitation, auth: true },
  { method: 'GET', path: '/api/v1/blood/requests', handle: handleBloodRequests, auth: true },
  { method: 'GET', path: '/api/v1/blood/crossmatch', handle: handleBloodCrossmatch, auth: true },
  { method: 'GET', path: '/api/v1/blood/transfusion-reactions', handle: handleBloodReactions, auth: true },
  { method: 'GET', path: '/api/v1/nutrition/assessments', handle: handleNutritionAssessments, auth: true },
  { method: 'GET', path: '/api/v1/nutrition/orders', handle: handleNutritionOrders, auth: true },
];
