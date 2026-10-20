/**
 * 健澜科技 jlmedaios - M198 核心业务域接口深度补全
 *
 * 手术详情 / 麻醉记录 / 出院小结 / 会诊记录 / 死亡病例讨论
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/**
 * GET /api/v1/surgery/requests/:id
 * 手术申请详情
 */
async function handleSurgeryDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const id = c.params?.id ?? 'SUR-001';

  const detail = {
    id,
    patient: { name: '张演示', gender: '男', age: 45, bedNo: '心内科一病区 3床' },
    surgery: { name: '腹腔镜胆囊切除术', level: 'III', date: '2026-10-20 09:00' },
    anesthesia: { method: '全身麻醉', asa: 'II' },
    surgeons: { operator: '李主任', assistant: '王医生', nurse: '赵护士' },
    preop: ['禁食 8 小时', '备皮', '抗生素皮试'],
    risk: { level: 'medium', note: 'ASA II 级，心肺功能尚可' },
  };

  return json(ok(detail));
}

/**
 * GET /api/v1/anesthesia/records
 * 麻醉记录列表
 */
async function handleAnesthesiaRecords(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const records = [
    { id: 'ANE-001', patient: '张演示', method: '全身麻醉', anesthetist: '刘医生', start: '2026-10-20 08:30', end: '2026-10-20 10:30', asa: 'II' },
    { id: 'ANE-002', patient: '李患者', method: '硬膜外麻醉', anesthetist: '陈医生', start: '2026-10-19 14:00', end: '2026-10-19 16:00', asa: 'I' },
    { id: 'ANE-003', patient: '王患者', method: '局部麻醉', anesthetist: '周医生', start: '2026-10-19 09:00', end: '2026-10-19 09:30', asa: 'I' },
  ];

  return json(ok({ records, totalCount: records.length }));
}

/**
 * GET /api/v1/discharge/summaries
 * 出院小结列表
 */
async function handleDischargeSummaries(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const summaries = [
    { id: 'DIS-001', patient: '张演示', admissionDiag: '冠心病', dischargeDiag: '冠心病（稳定型）', outcome: '好转', instructions: '出院带药 7 天，门诊随访', followUp: '2026-11-01 心内科门诊' },
    { id: 'DIS-002', patient: '李患者', admissionDiag: '急性阑尾炎', dischargeDiag: '急性阑尾炎（术后）', outcome: '治愈', instructions: '切口换药，避免剧烈运动', followUp: '2026-10-25 外科门诊' },
    { id: 'DIS-003', patient: '王患者', admissionDiag: '肺炎', dischargeDiag: '肺炎（吸收期）', outcome: '好转', instructions: '继续口服抗生素 3 天', followUp: '2026-10-22 呼吸科门诊' },
  ];

  return json(ok({ summaries, totalCount: summaries.length }));
}

/**
 * GET /api/v1/consultations
 * 会诊申请记录
 */
async function handleConsultations(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const consults = [
    { id: 'CON-001', applyDept: '心内科', consultDept: '内分泌科', patient: '张演示', purpose: '血糖管理', urgency: '普通', status: '已会诊' },
    { id: 'CON-002', applyDept: '普外科', consultDept: '心内科', patient: '李患者', purpose: '术前心功能评估', urgency: '加急', status: '待会诊' },
    { id: 'CON-003', applyDept: '呼吸科', consultDept: 'ICU', patient: '王患者', purpose: '呼吸衰竭会诊', urgency: '紧急', status: '已会诊' },
    { id: 'CON-004', applyDept: '神经内科', consultDept: '影像科', patient: '赵患者', purpose: '头颅 CT 解读', urgency: '普通', status: '待会诊' },
  ];

  return json(ok({ consults, totalCount: consults.length }));
}

/**
 * GET /api/v1/death-reviews
 * 死亡病例讨论记录
 */
async function handleDeathReviews(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const reviews = [
    { id: 'DR-001', patient: '患者A', cause: '急性心肌梗死', date: '2026-10-15', attendees: ['科室主任', '主治医生', '主管医生'], conclusion: '抢救及时，死因明确' },
    { id: 'DR-002', patient: '患者B', cause: '多器官功能衰竭', date: '2026-10-12', attendees: ['科室主任', 'ICU 主任', '主治医生'], conclusion: '病情进展快，建议加强早期识别' },
    { id: 'DR-003', patient: '患者C', cause: '严重感染性休克', date: '2026-10-08', attendees: ['科室主任', '感染科主任', '主治医生'], conclusion: '抗生素升级及时，建议加强院感防控' },
  ];

  return json(ok({ reviews, totalCount: reviews.length }));
}

export const m198Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/surgery/requests/:id', handle: handleSurgeryDetail, auth: true },
  { method: 'GET', path: '/api/v1/anesthesia/records', handle: handleAnesthesiaRecords, auth: true },
  { method: 'GET', path: '/api/v1/discharge/summaries', handle: handleDischargeSummaries, auth: true },
  { method: 'GET', path: '/api/v1/consultations', handle: handleConsultations, auth: true },
  { method: 'GET', path: '/api/v1/death-reviews', handle: handleDeathReviews, auth: true },
];
