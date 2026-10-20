/**
 * 健澜科技 jlmedaios - M257 业务域继续扩展
 *
 * 医保政策/产科/发热门诊/新生儿/门诊叫号/住院病区
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、医保/产科 ==================== */

/** GET /api/v1/insurance/policies - 医保政策 5 条 */
async function handleInsurancePolicies(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const policies = [
    { id: 'IP-001', name: '职工基本医疗保险', type: '职工', reimbursementRate: '门诊 70% / 住院 85%', effectiveDate: '2026-01-01', status: '有效' },
    { id: 'IP-002', name: '城乡居民基本医疗保险', type: '居民', reimbursementRate: '门诊 50% / 住院 70%', effectiveDate: '2026-01-01', status: '有效' },
    { id: 'IP-003', name: '离休干部医疗保障', type: '离休', reimbursementRate: '100%', effectiveDate: '2026-01-01', status: '有效' },
    { id: 'IP-004', name: '职工大病保险', type: '职工', reimbursementRate: '起付线以上 60%', effectiveDate: '2026-01-01', status: '有效' },
    { id: 'IP-005', name: '2025 年度居民医保政策', type: '居民', reimbursementRate: '门诊 45% / 住院 65%', effectiveDate: '2025-01-01', status: '已过期' },
  ];

  return json(ok({ policies, totalCount: policies.length }));
}

/** GET /api/v1/maternity/records - 产科记录 5 条 */
async function handleMaternityRecords(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const records = [
    { id: 'MR-001', mother: '王***', gestationalAge: '28 周', expectedDate: '2027-01-15', checkupCount: 6, riskLevel: '低' },
    { id: 'MR-002', mother: '李***', gestationalAge: '32 周', expectedDate: '2026-12-10', checkupCount: 8, riskLevel: '中（妊娠期糖尿病）' },
    { id: 'MR-003', mother: '张***', gestationalAge: '36 周', expectedDate: '2026-11-20', checkupCount: 10, riskLevel: '高（妊高症）' },
    { id: 'MR-004', mother: '赵***', gestationalAge: '20 周', expectedDate: '2027-03-01', checkupCount: 3, riskLevel: '低' },
    { id: 'MR-005', mother: '陈***', gestationalAge: '39 周', expectedDate: '2026-10-25', checkupCount: 12, riskLevel: '中（高龄初产）' },
  ];

  return json(ok({ records, totalCount: records.length }));
}

/* ==================== 二、发热门诊/新生儿 ==================== */

/** GET /api/v1/fever/clinics - 发热门诊 5 条 */
async function handleFeverClinics(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const patients = [
    { id: 'FC-001', patient: '刘***', temperature: '38.5℃', diagnosis: '急性上呼吸道感染', triageLevel: 'II 级（中等优先）', status: '就诊中' },
    { id: 'FC-002', patient: '孙***', temperature: '39.2℃', diagnosis: '肺炎（待确诊）', triageLevel: 'I 级（高优先）', status: '待就诊' },
    { id: 'FC-003', patient: '周***', temperature: '37.8℃', diagnosis: '普通感冒', triageLevel: 'III 级（常规）', status: '已离院' },
    { id: 'FC-004', patient: '吴***', temperature: '38.9℃', diagnosis: '流感（甲型）', triageLevel: 'II 级（中等优先）', status: '就诊中' },
    { id: 'FC-005', patient: '郑***', temperature: '37.5℃', diagnosis: '低热待查', triageLevel: 'III 级（常规）', status: '待就诊' },
  ];

  return json(ok({ patients, totalCount: patients.length }));
}

/** GET /api/v1/newborn/records - 新生儿记录 5 条 */
async function handleNewbornRecords(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const babies = [
    { id: 'NB-001', baby: '王***之女', weight: 3250, length: 50, apgar: 10, status: '正常' },
    { id: 'NB-002', baby: '李***之子', weight: 2800, length: 48, apgar: 9, status: '观察（轻度黄疸）' },
    { id: 'NB-003', baby: '张***之女', weight: 2400, length: 45, apgar: 8, status: '治疗（早产儿 NICU）' },
    { id: 'NB-004', baby: '陈***之子', weight: 3400, length: 51, apgar: 10, status: '正常' },
    { id: 'NB-005', baby: '赵***之女', weight: 3100, length: 49, apgar: 9, status: '正常' },
  ];

  return json(ok({ babies, totalCount: babies.length }));
}

/* ==================== 三、门诊/住院 ==================== */

/** GET /api/v1/outpatient/queue - 门诊叫号 5 条 */
async function handleOutpatientQueue(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const queues = [
    { id: 'OQ-001', dept: '心内科', waitingCount: 12, currentNo: 'A025', avgWaitTime: '18 分钟', doctor: '李***主任医师' },
    { id: 'OQ-002', dept: '内分泌科', waitingCount: 8, currentNo: 'B018', avgWaitTime: '12 分钟', doctor: '赵***副主任医师' },
    { id: 'OQ-003', dept: '骨科', waitingCount: 15, currentNo: 'C032', avgWaitTime: '25 分钟', doctor: '陈***主治医师' },
    { id: 'OQ-004', dept: '呼吸内科', waitingCount: 6, currentNo: 'D010', avgWaitTime: '10 分钟', doctor: '刘***副主任医师' },
    { id: 'OQ-005', dept: '全科', waitingCount: 4, currentNo: 'E008', avgWaitTime: '8 分钟', doctor: '王***主治医师' },
  ];

  return json(ok({ queues, totalCount: queues.length }));
}

/** GET /api/v1/inpatient/wards - 住院病区 5 条 */
async function handleInpatientWards(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const wards = [
    { id: 'IW-001', name: '心内科一病区', bedCount: 40, inHospital: 38, emptyBeds: 2, director: '李***主任' },
    { id: 'IW-002', name: '内分泌科病区', bedCount: 30, inHospital: 25, emptyBeds: 5, director: '赵***主任' },
    { id: 'IW-003', name: '骨科一病区', bedCount: 35, inHospital: 30, emptyBeds: 5, director: '陈***主任' },
    { id: 'IW-004', name: '呼吸内科病区', bedCount: 30, inHospital: 28, emptyBeds: 2, director: '刘***主任' },
    { id: 'IW-005', name: '神经内科病区', bedCount: 32, inHospital: 29, emptyBeds: 3, director: '周***主任' },
  ];

  return json(ok({ wards, totalCount: wards.length, totalBeds: 167, totalInHospital: 150 }));
}

export const m257Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/insurance/policies', handle: handleInsurancePolicies, auth: true },
  { method: 'GET', path: '/api/v1/maternity/records', handle: handleMaternityRecords, auth: true },
  { method: 'GET', path: '/api/v1/fever/clinics', handle: handleFeverClinics, auth: true },
  { method: 'GET', path: '/api/v1/newborn/records', handle: handleNewbornRecords, auth: true },
  { method: 'GET', path: '/api/v1/outpatient/queue', handle: handleOutpatientQueue, auth: true },
  { method: 'GET', path: '/api/v1/inpatient/wards', handle: handleInpatientWards, auth: true },
];
