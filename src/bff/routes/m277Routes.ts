/**
 * 健澜科技 jlmedaios - M277 业务域扩展
 *
 * 患者搜索/患者详情/医生列表/科室详情/今日排班/预约列表
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/patient/search - 患者搜索 5 条 */
async function handlePatientSearch(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patients = [
    { id: 'PT-001', name: '张***', gender: '男', age: 51, dept: '心内科' },
    { id: 'PT-002', name: '李***', gender: '女', age: 46, dept: '内分泌科' },
    { id: 'PT-003', name: '王***', gender: '男', age: 58, dept: '骨科' },
    { id: 'PT-004', name: '赵***', gender: '女', age: 36, dept: '呼吸内科' },
    { id: 'PT-005', name: '陈***', gender: '男', age: 71, dept: '神经内科' },
  ];
  return json(ok({ patients, totalCount: patients.length }));
}

/** GET /api/v1/patient/detail - 患者详情 1 条 */
async function handlePatientDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const detail = {
    id: 'PT-001',
    basicInfo: { name: '张***', gender: '男', age: 51, idCard: '3301**********1234', phone: '138****5678' },
    diagnoses: ['冠心病（稳定型心绞痛）', '高血压 2 级（很高危）', '2 型糖尿病'],
    medications: ['阿司匹林肠溶片 100mg qd', '阿托伐他汀钙片 20mg qn', '二甲双胍片 0.5g tid'],
    allergyHistory: [
      { allergen: '青霉素', severity: '过敏（皮疹）', note: '既往使用青霉素出现皮疹' },
    ],
  };
  return json(ok(detail));
}

/** GET /api/v1/doctor/list - 医生列表 8 条 */
async function handleDoctorList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const doctors = [
    { id: 'DR-001', name: '李***', dept: '心内科', title: '主任医师', specialty: '冠心病介入治疗、心律失常' },
    { id: 'DR-002', name: '赵***', dept: '内分泌科', title: '主任医师', specialty: '糖尿病及并发症、甲状腺疾病' },
    { id: 'DR-003', name: '陈***', dept: '骨科', title: '副主任医师', specialty: '关节置换、脊柱外科' },
    { id: 'DR-004', name: '刘***', dept: '呼吸内科', title: '副主任医师', specialty: '慢性阻塞性肺疾病、哮喘' },
    { id: 'DR-005', name: '周***', dept: '神经内科', title: '主任医师', specialty: '脑血管病、癫痫' },
    { id: 'DR-006', name: '吴***', dept: '消化内科', title: '主治医师', specialty: '胃肠疾病、肝病' },
    { id: 'DR-007', name: '郑***', dept: '急诊医学科', title: '副主任医师', specialty: '急危重症抢救、心肺复苏' },
    { id: 'DR-008', name: '王***', dept: '儿科', title: '主治医师', specialty: '小儿呼吸系统疾病、新生儿疾病' },
  ];
  return json(ok({ doctors, totalCount: doctors.length }));
}

/** GET /api/v1/department/detail - 科室详情 1 条 */
async function handleDepartmentDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const detail = {
    id: 'D001',
    name: '心内科',
    director: '李***主任医师',
    beds: 40,
    description: '心血管内科是医院重点科室，设有冠心病监护病房（CCU），开展冠脉造影、支架植入、射频消融等介入治疗。现有医师 18 人，其中主任医师 4 人、副主任医师 6 人。',
  };
  return json(ok(detail));
}

/** GET /api/v1/schedule/today - 今日排班 5 条 */
async function handleScheduleToday(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const schedules = [
    { id: 'ST-001', doctor: '李***', dept: '心内科', timeSlot: '上午 08:00-12:00', availableSlots: 20, bookedSlots: 15 },
    { id: 'ST-002', doctor: '赵***', dept: '内分泌科', timeSlot: '上午 08:00-12:00', availableSlots: 15, bookedSlots: 10 },
    { id: 'ST-003', doctor: '陈***', dept: '骨科', timeSlot: '下午 14:00-17:30', availableSlots: 18, bookedSlots: 12 },
    { id: 'ST-004', doctor: '刘***', dept: '呼吸内科', timeSlot: '上午 08:00-12:00', availableSlots: 12, bookedSlots: 8 },
    { id: 'ST-005', doctor: '周***', dept: '神经内科', timeSlot: '下午 14:00-17:30', availableSlots: 16, bookedSlots: 14 },
  ];
  return json(ok({ schedules, date: '2026-10-20', totalDoctors: 5 }));
}

/** GET /api/v1/appointment/list - 预约列表 5 条 */
async function handleAppointmentList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const appointments = [
    { id: 'AP-001', patient: '张***', doctor: '李***', dept: '心内科', time: '2026-10-21 09:00', status: '已确认' },
    { id: 'AP-002', patient: '李***', doctor: '赵***', dept: '内分泌科', time: '2026-10-21 10:30', status: '已确认' },
    { id: 'AP-003', patient: '王***', doctor: '陈***', dept: '骨科', time: '2026-10-21 14:00', status: '待确认' },
    { id: 'AP-004', patient: '赵***', doctor: '刘***', dept: '呼吸内科', time: '2026-10-22 08:30', status: '已确认' },
    { id: 'AP-005', patient: '陈***', doctor: '周***', dept: '神经内科', time: '2026-10-22 15:00', status: '已取消' },
  ];
  return json(ok({ appointments, totalCount: appointments.length }));
}

export const m277Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/patient/search', handle: handlePatientSearch, auth: true },
  { method: 'GET', path: '/api/v1/patient/detail', handle: handlePatientDetail, auth: true },
  { method: 'GET', path: '/api/v1/doctor/list', handle: handleDoctorList, auth: true },
  { method: 'GET', path: '/api/v1/department/detail', handle: handleDepartmentDetail, auth: true },
  { method: 'GET', path: '/api/v1/schedule/today', handle: handleScheduleToday, auth: true },
  { method: 'GET', path: '/api/v1/appointment/list', handle: handleAppointmentList, auth: true },
];
