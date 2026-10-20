/**
 * 健澜科技 jlmedaios - M235 PDA 新路径 + 核心业务详情深度
 *
 * PDA 待执行任务/扫码核对新路径 + 门诊/住院/医嘱/药品/出院详情
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、移动护理 PDA 新路径 ==================== */

/** GET /api/v1/mobile/pda-tasks - PDA 待执行任务 5 条 */
async function handleMobilePdaTasks(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const tasks = [
    { id: 'PDA-TASK-001', taskType: '输液', patient: '张演示', bed: '12床', item: '0.9% 生理盐水 250ml+头孢曲松 2g', execTime: '2026-10-20 08:00' },
    { id: 'PDA-TASK-002', taskType: '口服药', patient: '李患者', bed: '15床', item: '阿司匹林肠溶片 100mg qd', execTime: '2026-10-20 08:30' },
    { id: 'PDA-TASK-003', taskType: '注射', patient: '王先生', bed: '18床', item: '低分子肝素钙 4000IU 皮下注射', execTime: '2026-10-20 09:00' },
    { id: 'PDA-TASK-004', taskType: '测量', patient: '赵女士', bed: '20床', item: '生命体征测量（体温/脉搏/血压/血氧）', execTime: '2026-10-20 10:00' },
    { id: 'PDA-TASK-005', taskType: '护理', patient: '刘大爷', bed: '22床', item: '伤口换药（普外科术后第 3 天）', execTime: '2026-10-20 11:00' },
  ];

  return json(ok({ tasks, totalCount: tasks.length }));
}

/** GET /api/v1/mobile/scan - PDA 扫码核对记录 3 条 */
async function handleMobileScan(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const scans = [
    { id: 'PDA-SCAN-001', drugBarcode: 'DRG-20261020-001', patientBarcode: 'WRB-P001', result: '通过', nurse: '王护士', time: '2026-10-20 08:05' },
    { id: 'PDA-SCAN-002', drugBarcode: 'DRG-20261020-002', patientBarcode: 'WRB-P002', result: '通过', nurse: '李护士', time: '2026-10-20 09:05' },
    { id: 'PDA-SCAN-003', drugBarcode: 'DRG-20261020-003', patientBarcode: 'WRB-P009', result: '不通过（药品码与患者腕带不匹配）', nurse: '王护士', time: '2026-10-20 10:05' },
  ];

  return json(ok({ scans, totalCount: scans.length }));
}

/* ==================== 二、核心业务详情 ==================== */

/** GET /api/v1/outpatient/detail - 门诊详情 */
async function handleOutpatientDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const detail = {
    visitNo: 'OPD20261020001',
    patient: { name: '张演示', gender: '男', age: 58, medicalRecordNo: 'MRN-100235' },
    dept: '心内科',
    doctor: '李医生',
    diagnosis: '冠心病（稳定型心绞痛）、高血压 2 级',
    prescriptions: [
      '阿司匹林肠溶片 100mg qd × 14 天',
      '阿托伐他汀钙片 20mg qn × 30 天',
      '琥珀酸美托洛尔缓释片 47.5mg qd × 14 天',
    ],
    fees: { registration: 25.0, exam: 295.0, medicine: 168.50, total: 488.50, insurancePaid: 350.0, selfPaid: 138.50 },
    visitTime: '2026-10-20 09:00',
  };

  return json(ok(detail));
}

/** GET /api/v1/inpatient/detail - 住院详情 */
async function handleInpatientDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const detail = {
    admissionNo: 'ADM20261015008',
    patient: { name: '王先生', gender: '男', age: 66, medicalRecordNo: 'MRN-100451' },
    dept: '呼吸与危重症医学科',
    bed: '18床',
    admissionDate: '2026-10-15',
    diagnosis: '社区获得性肺炎（非重症）、2 型糖尿病',
    orders: [
      '0.9% 生理盐水 250ml+头孢呋辛 1.5g ivgtt q12h',
      '盐酸氨溴索注射液 30mg iv bid',
      '二甲双胍缓释片 0.5g po bid',
    ],
    fees: { deposit: 5000.0, consumed: 3286.40, balance: 1713.60, days: 5 },
  };

  return json(ok(detail));
}

/** GET /api/v1/order/detail - 医嘱详情 */
async function handleOrderDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const detail = {
    orderNo: 'ORD202610200032',
    patient: '李患者（15床）',
    drug: '注射用头孢曲松钠',
    dosage: '2.0g',
    route: '静脉滴注（ivgtt）',
    frequency: '每日一次（qd）',
    startAt: '2026-10-20 08:00',
    stopAt: '2026-10-26 08:00',
    prescriber: '赵医生',
    status: '执行中',
  };

  return json(ok(detail));
}

/** GET /api/v1/medication/detail - 药品详情 */
async function handleMedicationDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const detail = {
    drugName: '阿托伐他汀钙片',
    genericName: 'Atorvastatin Calcium Tablets',
    specification: '20mg × 7片/盒',
    dosageForm: '片剂（薄膜衣片）',
    insuranceCategory: '乙类医保',
    stock: 1250,
    unitPrice: 6.80,
    manufacturer: '某制药股份有限公司',
    usage: '口服，每晚一次（qn）',
    storageCondition: '遮光、密封，阴凉处保存',
  };

  return json(ok(detail));
}

/** GET /api/v1/discharge/detail - 出院详情 */
async function handleDischargeDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const detail = {
    dischargeNo: 'DIS20261020011',
    patient: '刘大爷',
    admissionDate: '2026-10-08',
    dischargeDate: '2026-10-20',
    losDays: 12,
    dischargeDiagnosis: '社区获得性肺炎（好转）、2 型糖尿病',
    dischargeOrders: [
      '阿莫西林胶囊 0.5g po tid × 7 天',
      '二甲双胍缓释片 0.5g po bid，监测血糖',
      '避免受凉，1 周后门诊复查胸部 CT',
    ],
    followupPlan: { dept: '呼吸科门诊', date: '2026-10-27 上午', contact: '随访护士 王护士' },
    fees: { total: 8652.30, insurancePaid: 6230.0, selfPaid: 2422.30, deposit: 5000.0, refund: 2577.70 },
  };

  return json(ok(detail));
}

export const m235Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/mobile/pda-tasks', handle: handleMobilePdaTasks, auth: true },
  { method: 'GET', path: '/api/v1/mobile/scan', handle: handleMobileScan, auth: true },
  { method: 'GET', path: '/api/v1/outpatient/detail', handle: handleOutpatientDetail, auth: true },
  { method: 'GET', path: '/api/v1/inpatient/detail', handle: handleInpatientDetail, auth: true },
  { method: 'GET', path: '/api/v1/order/detail', handle: handleOrderDetail, auth: true },
  { method: 'GET', path: '/api/v1/medication/detail', handle: handleMedicationDetail, auth: true },
  { method: 'GET', path: '/api/v1/discharge/detail', handle: handleDischargeDetail, auth: true },
];
