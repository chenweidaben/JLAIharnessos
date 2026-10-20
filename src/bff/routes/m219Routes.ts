/**
 * 健澜科技 jlmedaios - M219 人事管理 + 合同管理 + 后勤保障
 *
 * 员工花名册/考勤统计/培训记录 + 合同列表/到期提醒 + 被服/污水/车辆
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、人事管理 ==================== */

/** GET /api/v1/hr/employees - 员工花名册 */
async function handleHrEmployees(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const employees = [
    { id: 'EMP-001', name: '李主任', employeeNo: 'YL001', dept: '心内科', title: '主任医师', education: '博士', hireDate: '2000-07-01', status: '在职' },
    { id: 'EMP-002', name: '李医生', employeeNo: 'YL015', dept: '心内科', title: '主治医师', education: '硕士', hireDate: '2015-08-01', status: '在职' },
    { id: 'EMP-003', name: '王护士', employeeNo: 'HL008', dept: '心内科', title: '主管护师', education: '本科', hireDate: '2012-09-01', status: '在职' },
    { id: 'EMP-004', name: '张药师', employeeNo: 'YJ003', dept: '药剂科', title: '副主任药师', education: '硕士', hireDate: '2008-07-01', status: '休假' },
    { id: 'EMP-005', name: '陈医生', employeeNo: 'YL028', dept: '呼吸科', title: '住院医师', education: '本科', hireDate: '2022-08-01', status: '在职' },
  ];

  return json(ok({ employees, totalCount: employees.length }));
}

/** GET /api/v1/hr/attendance - 考勤统计 */
async function handleHrAttendance(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const attendance = [
    { id: 'ATT-001', dept: '心内科', present: 45, leave: 2, businessTrip: 1, late: 1, earlyLeave: 0 },
    { id: 'ATT-002', dept: '呼吸科', present: 32, leave: 1, businessTrip: 0, late: 0, earlyLeave: 0 },
    { id: 'ATT-003', dept: '普外科', present: 40, leave: 3, businessTrip: 2, late: 1, earlyLeave: 1 },
    { id: 'ATT-004', dept: '妇产科', present: 38, leave: 1, businessTrip: 0, late: 0, earlyLeave: 0 },
    { id: 'ATT-005', dept: '急诊科', present: 35, leave: 0, businessTrip: 1, late: 2, earlyLeave: 0 },
  ];

  return json(ok({ attendance, totalCount: attendance.length }));
}

/** GET /api/v1/hr/training - 培训记录 */
async function handleHrTraining(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const training = [
    { id: 'TRN-001', name: '心肺复苏培训', participants: 50, lecturer: '急诊科-刘主任', time: '2026-10-15 14:00', passRate: 96.0, excellentRate: 35.0 },
    { id: 'TRN-002', name: '院感防控培训', participants: 80, lecturer: '院感科-李科长', time: '2026-10-12 10:00', passRate: 98.5, excellentRate: 42.0 },
    { id: 'TRN-003', name: '病历书写规范', participants: 60, lecturer: '质控科-张主任', time: '2026-10-10 15:00', passRate: 95.0, excellentRate: 28.0 },
    { id: 'TRN-004', name: '医患沟通技巧', participants: 45, lecturer: '医务处-王处长', time: '2026-10-08 09:00', passRate: 97.5, excellentRate: 38.0 },
    { id: 'TRN-005', name: '设备操作培训', participants: 30, lecturer: '设备科-赵工', time: '2026-10-05 14:00', passRate: 100.0, excellentRate: 50.0 },
  ];

  return json(ok({ training, totalCount: training.length }));
}

/* ==================== 二、合同管理 ==================== */

/** GET /api/v1/contracts/list - 合同列表 */
async function handleContractsList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const contracts = [
    { id: 'CON-001', name: 'CT设备采购合同', party: 'GE医疗', amount: 1250.0, signDate: '2025-06-01', expiryDate: '2028-05-31', status: '履行中' },
    { id: 'CON-002', name: '药品供应合同（年度）', party: '国药控股浙江公司', amount: 2000.0, signDate: '2026-01-01', expiryDate: '2026-12-31', status: '履行中' },
    { id: 'CON-003', name: '物业服务合同', party: '绿城服务', amount: 350.0, signDate: '2025-03-01', expiryDate: '2027-02-28', status: '履行中' },
    { id: 'CON-004', name: '信息化建设合同', party: '健澜科技', amount: 800.0, signDate: '2026-05-01', expiryDate: '2027-04-30', status: '履行中' },
    { id: 'CON-005', name: '基建维修合同（旧楼改造）', party: '浙江建工集团', amount: 1500.0, signDate: '2025-09-01', expiryDate: '2026-08-31', status: '已完成' },
  ];

  return json(ok({ contracts, totalCount: contracts.length }));
}

/** GET /api/v1/contracts/renewals - 到期提醒 */
async function handleContractsRenewals(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const renewals = [
    { id: 'REN-001', name: '药品供应合同（年度）', expiryDate: '2026-12-31', remainingDays: 72, suggestion: '续签' },
    { id: 'REN-002', name: '物业服务合同', expiryDate: '2027-02-28', remainingDays: 131, suggestion: '重新招标' },
    { id: 'REN-003', name: '医用耗材供应合同', expiryDate: '2026-11-30', remainingDays: 41, suggestion: '续签' },
  ];

  return json(ok({ renewals, totalCount: renewals.length }));
}

/* ==================== 三、后勤保障 ==================== */

/** GET /api/v1/logistics/laundry - 被服管理 */
async function handleLogisticsLaundry(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const laundry = [
    { id: 'LAU-001', dept: '心内科', type: '床单', quantity: 50, washDate: '2026-10-20', status: '已洗涤' },
    { id: 'LAU-002', dept: '普外科', type: '手术衣', quantity: 30, washDate: '2026-10-20', status: '已消毒' },
    { id: 'LAU-003', dept: '妇产科', type: '被罩', quantity: 45, washDate: '2026-10-20', status: '已送回' },
    { id: 'LAU-004', dept: '急诊科', type: '病号服', quantity: 25, washDate: '2026-10-19', status: '已送回' },
    { id: 'LAU-005', dept: 'ICU', type: '枕套', quantity: 20, washDate: '2026-10-20', status: '已洗涤' },
  ];

  return json(ok({ laundry, totalCount: laundry.length }));
}

/** GET /api/v1/logistics/water - 污水处理 */
async function handleLogisticsWater(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    todayVolume: 125.5,
    codValue: 35.2,
    phValue: 7.2,
    status: '达标',
    checkTime: '2026-10-20 10:00',
  }));
}

/** GET /api/v1/logistics/vehicles - 车辆管理 */
async function handleLogisticsVehicles(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const vehicles = [
    { id: 'VEH-001', plateNo: '浙A·120急救', type: '救护车', purpose: '院前急救', driver: '王师傅', todayTrip: '出诊 3 次（心内科/急诊科/儿科）', status: '外出' },
    { id: 'VEH-002', plateNo: '浙A·D8888', type: '公务车', purpose: '行政办公', driver: '李师傅', todayTrip: '无（待命）', status: '待命' },
    { id: 'VEH-003', plateNo: '浙A·W6666', type: '物资车', purpose: '药品/物资配送', driver: '赵师傅', todayTrip: '配送至检验科/药剂科', status: '维修' },
  ];

  return json(ok({ vehicles, totalCount: vehicles.length }));
}

export const m219Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/hr/employees', handle: handleHrEmployees, auth: true },
  { method: 'GET', path: '/api/v1/hr/attendance', handle: handleHrAttendance, auth: true },
  { method: 'GET', path: '/api/v1/hr/training', handle: handleHrTraining, auth: true },
  { method: 'GET', path: '/api/v1/contracts/list', handle: handleContractsList, auth: true },
  { method: 'GET', path: '/api/v1/contracts/renewals', handle: handleContractsRenewals, auth: true },
  { method: 'GET', path: '/api/v1/logistics/laundry', handle: handleLogisticsLaundry, auth: true },
  { method: 'GET', path: '/api/v1/logistics/water', handle: handleLogisticsWater, auth: true },
  { method: 'GET', path: '/api/v1/logistics/vehicles', handle: handleLogisticsVehicles, auth: true },
];
