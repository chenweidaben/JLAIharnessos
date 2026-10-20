/**
 * 健澜科技 jlmedaios - M365 P1 业务扩展：人力资源深度打磨
 *
 * 人力看板/招聘管理/培训管理/绩效管理/排班管理/考勤管理
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/hr/staff-dashboard - 人力看板 5 条 */
async function handleHrStaffDashboard(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HSD-001', metricName: '总员工数', value: '1,200 人（全院总员工数）', unit: '人', trend: '稳定（较上月持平，波动 < 1%）', time: '2026-10-20（实时统计）' },
    { id: 'HSD-002', metricName: '医生数', value: '400 人（全院医生数）', unit: '人', trend: '上升（较上月增加 5 人，新招聘医生入职）', time: '2026-10-20（实时统计）' },
    { id: 'HSD-003', metricName: '护士数', value: '600 人（全院护士数）', unit: '人', trend: '稳定（较上月持平，波动 < 1%）', time: '2026-10-20（实时统计）' },
    { id: 'HSD-004', metricName: '行政后勤数', value: '200 人（全院行政后勤数）', unit: '人', trend: '稳定（较上月持平，波动 < 1%）', time: '2026-10-20（实时统计）' },
    { id: 'HSD-005', metricName: '员工流失率', value: '3%（本年度员工流失率）', unit: '%', trend: '下降（较去年下降 2%，因改善了员工待遇）', time: '2026-10-20（年度统计）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/staff-recruitment - 招聘管理 5 条 */
async function handleHrStaffRecruitment(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HSR-001', positionName: '心内科主治医师（招聘 2 人）', department: '心内科', headcount: '2 人（招聘人数）', status: '招聘中（已收到 10 份简历，已面试 3 人）', publishTime: '2026-10-01（岗位发布时间）' },
    { id: 'HSR-002', positionName: '骨科副主任医师（招聘 1 人）', department: '骨科', headcount: '1 人（招聘人数）', status: '招聘中（已收到 5 份简历，已面试 2 人）', publishTime: '2026-10-05（岗位发布时间）' },
    { id: 'HSR-003', positionName: '急诊科护士（招聘 5 人）', department: '急诊科', headcount: '5 人（招聘人数）', status: '招聘中（已收到 20 份简历，已面试 5 人）', publishTime: '2026-10-10（岗位发布时间）' },
    { id: 'HSR-004', positionName: '放射科技师（招聘 2 人）', department: '放射科', headcount: '2 人（招聘人数）', status: '招聘中（已收到 8 份简历，已面试 3 人）', publishTime: '2026-10-12（岗位发布时间）' },
    { id: 'HSR-005', positionName: '行政人事专员（招聘 1 人）', department: '人力资源部', headcount: '1 人（招聘人数）', status: '招聘中（已收到 15 份简历，已面试 4 人）', publishTime: '2026-10-15（岗位发布时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/staff-training - 培训管理 5 条 */
async function handleHrStaffTraining(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HST-001', trainingName: '心肺复苏（CPR）培训（新员工培训）', participants: '50 人（新入职员工）', hours: '8 学时（培训学时）', score: '95 分（培训考核平均分）', time: '2026-10-15 至 2026-10-16（培训时间）' },
    { id: 'HST-002', trainingName: '医疗法律法规培训（全院医生培训）', participants: '400 人（全院医生）', hours: '4 学时（培训学时）', score: '90 分（培训考核平均分）', time: '2026-10-10（培训时间）' },
    { id: 'HST-003', trainingName: '护理技能培训（全院护士培训）', participants: '600 人（全院护士）', hours: '6 学时（培训学时）', score: '92 分（培训考核平均分）', time: '2026-10-12（培训时间）' },
    { id: 'HST-004', trainingName: '医院信息系统使用培训（全院员工培训）', participants: '1,200 人（全院员工）', hours: '2 学时（培训学时）', score: '88 分（培训考核平均分）', time: '2026-10-08（培训时间）' },
    { id: 'HST-005', trainingName: '消防安全培训（全院员工培训）', participants: '1,200 人（全院员工）', hours: '2 学时（培训学时）', score: '96 分（培训考核平均分）', time: '2026-10-05（培训时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/staff-performance - 绩效管理 5 条 */
async function handleHrStaffPerformance(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HSP-001', employeeName: '李***（心内科主治医师）', department: '心内科', metric: '门诊量（500 人次/月）、住院量（50 人/月）、患者满意度（95 分）', score: '92 分（百分制绩效得分）', grade: 'A（优秀）' },
    { id: 'HSP-002', employeeName: '赵***（骨科主任医师）', department: '骨科', metric: '门诊量（300 人次/月）、手术量（30 台/月）、患者满意度（90 分）', score: '88 分（百分制绩效得分）', grade: 'B（良好）' },
    { id: 'HSP-003', employeeName: '孙***（内分泌科副主任医师）', department: '内分泌科', metric: '门诊量（400 人次/月）、住院量（40 人/月）、患者满意度（92 分）', score: '90 分（百分制绩效得分）', grade: 'A（优秀）' },
    { id: 'HSP-004', employeeName: '周***（呼吸内科主治医师）', department: '呼吸内科', metric: '门诊量（350 人次/月）、住院量（35 人/月）、患者满意度（88 分）', score: '85 分（百分制绩效得分）', grade: 'B（良好）' },
    { id: 'HSP-005', employeeName: '吴***（普外科副主任医师）', department: '普外科', metric: '门诊量（300 人次/月）、手术量（25 台/月）、患者满意度（90 分）', score: '86 分（百分制绩效得分）', grade: 'B（良好）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/staff-schedule - 排班管理 5 条 */
async function handleHrStaffSchedule(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HSS-001', employeeName: '李***（心内科主治医师）', department: '心内科', shift: '白班（08:00 至 17:00）', time: '2026-10-20（排班日期）', status: '已排班（按时到岗）' },
    { id: 'HSS-002', employeeName: '王***（急诊科护士）', department: '急诊科', shift: '夜班（17:00 至 次日 08:00）', time: '2026-10-20（排班日期）', status: '已排班（按时到岗）' },
    { id: 'HSS-003', employeeName: '赵***（骨科主任医师）', department: '骨科', shift: '手术班（08:00 至 18:00，手术日）', time: '2026-10-20（排班日期）', status: '已排班（按时到岗）' },
    { id: 'HSS-004', employeeName: '刘***（放射科技师）', department: '放射科', shift: '晚班（12:00 至 20:00）', time: '2026-10-20（排班日期）', status: '已排班（按时到岗）' },
    { id: 'HSS-005', employeeName: '陈***（普外科副主任医师）', department: '普外科', shift: '休班（休息）', time: '2026-10-20（排班日期）', status: '已排班（休班）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/hr/staff-attendance - 考勤管理 5 条 */
async function handleHrStaffAttendance(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'HSA-001', employeeName: '李***（心内科主治医师）', date: '2026-10-20（考勤日期）', checkInTime: '07:55（上班打卡时间）、17:05（下班打卡时间）', status: '正常（出勤 9 小时，无迟到早退）', remark: '无异常' },
    { id: 'HSA-002', employeeName: '王***（急诊科护士）', date: '2026-10-20（考勤日期）', checkInTime: '16:55（夜班上班打卡时间）、次日 08:05（夜班下班打卡时间）', status: '正常（夜班出勤 15 小时，无迟到早退）', remark: '无异常' },
    { id: 'HSA-003', employeeName: '赵***（骨科主任医师）', date: '2026-10-20（考勤日期）', checkInTime: '07:50（上班打卡时间）、18:05（下班打卡时间，手术日延长）', status: '正常（出勤 10 小时，无迟到早退）', remark: '无异常' },
    { id: 'HSA-004', employeeName: '刘***（放射科技师）', date: '2026-10-20（考勤日期）', checkInTime: '11:55（晚班上班打卡时间）、20:05（晚班下班打卡时间）', status: '正常（晚班出勤 8 小时，无迟到早退）', remark: '无异常' },
    { id: 'HSA-005', employeeName: '陈***（普外科副主任医师）', date: '2026-10-20（考勤日期）', checkInTime: '无（休班，无打卡记录）', status: '休班（当日休息）', remark: '已报备休班' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m365Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/hr/staff-dashboard', handle: handleHrStaffDashboard, auth: true },
  { method: 'GET', path: '/api/v1/hr/staff-recruitment', handle: handleHrStaffRecruitment, auth: true },
  { method: 'GET', path: '/api/v1/hr/staff-training', handle: handleHrStaffTraining, auth: true },
  { method: 'GET', path: '/api/v1/hr/staff-performance', handle: handleHrStaffPerformance, auth: true },
  { method: 'GET', path: '/api/v1/hr/staff-schedule', handle: handleHrStaffSchedule, auth: true },
  { method: 'GET', path: '/api/v1/hr/staff-attendance', handle: handleHrStaffAttendance, auth: true },
];
