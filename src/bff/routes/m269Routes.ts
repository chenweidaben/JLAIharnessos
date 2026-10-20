/**
 * 健澜科技 jlmedaios - M269 业务域扩展
 *
 * 科室列表/医生排班/入院登记/出院记录/医保结算/每日统计
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、科室/排班 ==================== */

/** GET /api/v1/department/list - 科室列表 8 条 */
async function handleDepartmentList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const depts = [
    { id: 'D001', name: '心内科', type: '内科', beds: 40, director: '李***' },
    { id: 'D002', name: '内分泌科', type: '内科', beds: 30, director: '赵***' },
    { id: 'D003', name: '骨科', type: '外科', beds: 35, director: '陈***' },
    { id: 'D004', name: '呼吸内科', type: '内科', beds: 30, director: '刘***' },
    { id: 'D005', name: '神经内科', type: '内科', beds: 32, director: '周***' },
    { id: 'D006', name: '消化内科', type: '内科', beds: 28, director: '吴***' },
    { id: 'D007', name: '急诊医学科', type: '急诊', beds: 20, director: '郑***' },
    { id: 'D008', name: '儿科', type: '儿科', beds: 30, director: '王***' },
  ];
  return json(ok({ departments: depts, totalCount: depts.length }));
}

/** GET /api/v1/doctor/schedule - 医生排班 5 条 */
async function handleDoctorSchedule(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const schedules = [
    { id: 'DS-001', doctor: '李***', dept: '心内科', dayOfWeek: '周一', timeSlot: '上午 08:00-12:00', availableSlots: 20 },
    { id: 'DS-002', doctor: '赵***', dept: '内分泌科', dayOfWeek: '周二', timeSlot: '下午 14:00-17:30', availableSlots: 15 },
    { id: 'DS-003', doctor: '陈***', dept: '骨科', dayOfWeek: '周三', timeSlot: '上午 08:00-12:00', availableSlots: 18 },
    { id: 'DS-004', doctor: '刘***', dept: '呼吸内科', dayOfWeek: '周四', timeSlot: '下午 14:00-17:30', availableSlots: 12 },
    { id: 'DS-005', doctor: '周***', dept: '神经内科', dayOfWeek: '周五', timeSlot: '上午 08:00-12:00', availableSlots: 16 },
  ];
  return json(ok({ schedules, totalCount: schedules.length }));
}

/* ==================== 二、入院/出院 ==================== */

/** GET /api/v1/patient/admission - 入院登记 5 条 */
async function handlePatientAdmission(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const admissions = [
    { id: 'AD-001', patient: '张***', dept: '心内科', bedNo: '312-05', admissionTime: '2026-10-18 09:30', status: '在院' },
    { id: 'AD-002', patient: '李***', dept: '骨科', bedNo: '208-12', admissionTime: '2026-10-19 14:00', status: '在院' },
    { id: 'AD-003', patient: '王***', dept: '呼吸内科', bedNo: '405-03', admissionTime: '2026-10-20 08:15', status: '在院' },
    { id: 'AD-004', patient: '赵***', dept: '神经内科', bedNo: '501-08', admissionTime: '2026-10-15 10:00', status: '待手术' },
    { id: 'AD-005', patient: '陈***', dept: '内分泌科', bedNo: '210-02', admissionTime: '2026-10-20 11:00', status: '刚入院' },
  ];
  return json(ok({ admissions, totalCount: admissions.length }));
}

/** GET /api/v1/patient/discharge - 出院记录 5 条 */
async function handlePatientDischarge(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const discharges = [
    { id: 'DC-001', patient: '孙***', dept: '心内科', dischargeTime: '2026-10-18 10:00', diagnosis: '冠心病、高血压 2 级', status: '已出院' },
    { id: 'DC-002', patient: '周***', dept: '骨科', dischargeTime: '2026-10-19 15:30', diagnosis: '右肩袖损伤术后', status: '已出院' },
    { id: 'DC-003', patient: '吴***', dept: '呼吸内科', dischargeTime: '2026-10-17 09:00', diagnosis: '社区获得性肺炎', status: '已出院' },
    { id: 'DC-004', patient: '郑***', dept: '内分泌科', dischargeTime: '2026-10-20 11:30', diagnosis: '2 型糖尿病（血糖控制达标）', status: '已出院' },
    { id: 'DC-005', patient: '钱***', dept: '神经内科', dischargeTime: '2026-10-20 14:00', diagnosis: '短暂性脑缺血发作', status: '出院带药中' },
  ];
  return json(ok({ discharges, totalCount: discharges.length }));
}

/* ==================== 三、医保/统计 ==================== */

/** GET /api/v1/medical/insurance - 医保结算 5 条 */
async function handleMedicalInsurance(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const settlements = [
    { id: 'MI-001', patient: '张***', insuranceType: '职工医保', totalCost: '¥8,560.00', reimbursement: '¥7,276.00', selfPay: '¥1,284.00' },
    { id: 'MI-002', patient: '李***', insuranceType: '居民医保', totalCost: '¥12,300.00', reimbursement: '¥8,610.00', selfPay: '¥3,690.00' },
    { id: 'MI-003', patient: '王***', insuranceType: '职工医保', totalCost: '¥3,200.00', reimbursement: '¥2,560.00', selfPay: '¥640.00' },
    { id: 'MI-004', patient: '赵***', insuranceType: '离休', totalCost: '¥15,800.00', reimbursement: '¥15,800.00', selfPay: '¥0.00' },
    { id: 'MI-005', patient: '陈***', insuranceType: '职工医保', totalCost: '¥6,450.00', reimbursement: '¥5,482.00', selfPay: '¥968.00' },
  ];
  return json(ok({ settlements, totalCount: settlements.length, totalReimbursement: '¥39,728.00', totalSelfPay: '¥6,582.00' }));
}

/** GET /api/v1/statistics/daily - 每日统计 5 条 */
async function handleStatisticsDaily(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const stats = [
    { id: 'SD-001', date: '2026-10-20', outpatientVolume: 3200, inpatientVolume: 150, surgeryCount: 45, revenue: '¥1,250,000' },
    { id: 'SD-002', date: '2026-10-19', outpatientVolume: 3100, inpatientVolume: 148, surgeryCount: 42, revenue: '¥1,180,000' },
    { id: 'SD-003', date: '2026-10-18', outpatientVolume: 2800, inpatientVolume: 145, surgeryCount: 38, revenue: '¥1,050,000' },
    { id: 'SD-004', date: '2026-10-17', outpatientVolume: 3300, inpatientVolume: 152, surgeryCount: 48, revenue: '¥1,320,000' },
    { id: 'SD-005', date: '2026-10-16', outpatientVolume: 3050, inpatientVolume: 147, surgeryCount: 40, revenue: '¥1,150,000' },
  ];
  return json(ok({ dailyStats: stats, totalOutpatient: 15450, totalInpatient: 742, totalSurgery: 213, totalRevenue: '¥5,950,000' }));
}

export const m269Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/department/list', handle: handleDepartmentList, auth: true },
  { method: 'GET', path: '/api/v1/doctor/schedule', handle: handleDoctorSchedule, auth: true },
  { method: 'GET', path: '/api/v1/patient/admission', handle: handlePatientAdmission, auth: true },
  { method: 'GET', path: '/api/v1/patient/discharge', handle: handlePatientDischarge, auth: true },
  { method: 'GET', path: '/api/v1/medical/insurance', handle: handleMedicalInsurance, auth: true },
  { method: 'GET', path: '/api/v1/statistics/daily', handle: handleStatisticsDaily, auth: true },
];
