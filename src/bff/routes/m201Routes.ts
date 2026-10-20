/**
 * 健澜科技 jlmedaios - M201 患者服务管理域
 *
 * 投诉建议 / 随访计划 / 健康教育 / 排班表 / 考勤统计
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/**
 * GET /api/v1/patient/complaints
 * 投诉建议列表
 */
async function handleComplaints(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const complaints = [
    { id: 'CMP-001', patient: '张演示', type: '服务态度', content: '医生问诊时间过短', status: '已处理', handler: '客服-小王', satisfaction: '满意' },
    { id: 'CMP-002', patient: '李患者', type: '环境设施', content: '病房空调制冷不足', status: '处理中', handler: '后勤-小李', satisfaction: null },
    { id: 'CMP-003', patient: '王患者', type: '收费问题', content: '检查费用与公示不符', status: '已处理', handler: '财务-小张', satisfaction: '一般' },
    { id: 'CMP-004', patient: '赵患者', type: '医疗质量', content: '等待检查时间过长', status: '待处理', handler: null, satisfaction: null },
    { id: 'CMP-005', patient: '刘患者', type: '服务态度', content: '护士呼叫响应慢', status: '已处理', handler: '护理部-小陈', satisfaction: '不满意' },
  ];

  return json(ok({ complaints, totalCount: complaints.length }));
}

/**
 * GET /api/v1/patient/followups
 * 随访计划
 */
async function handleFollowups(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const followups = [
    { id: 'FLW-001', patient: '张演示', type: '电话', planTime: '2026-10-22 09:00', actualTime: '2026-10-22 09:15', result: '血压控制良好', nextTime: '2026-11-22' },
    { id: 'FLW-002', patient: '李患者', type: '门诊', planTime: '2026-10-25 10:00', actualTime: null, result: null, nextTime: null },
    { id: 'FLW-003', patient: '王患者', type: '上门', planTime: '2026-10-23 14:00', actualTime: '2026-10-23 14:30', result: '伤口愈合良好', nextTime: '2026-10-30' },
    { id: 'FLW-004', patient: '赵患者', type: '电话', planTime: '2026-10-21 08:30', actualTime: '2026-10-21 08:45', result: '用药依从性好', nextTime: '2026-11-21' },
    { id: 'FLW-005', patient: '刘患者', type: '门诊', planTime: '2026-10-28 11:00', actualTime: null, result: null, nextTime: null },
  ];

  return json(ok({ followups, totalCount: followups.length }));
}

/**
 * GET /api/v1/patient/education
 * 健康教育处方
 */
async function handleEducation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const educations = [
    { id: 'EDU-001', disease: '冠心病', content: '低盐低脂饮食，每日食盐<5g', method: '书面', educator: '心内科-李医生', mastery: '基本掌握' },
    { id: 'EDU-002', disease: '糖尿病', content: '每周有氧运动 150 分钟', method: '口头', educator: '内分泌科-王医生', mastery: '完全掌握' },
    { id: 'EDU-003', disease: '高血压', content: '每日监测血压 2 次', method: '视频', educator: '心内科-张医生', mastery: '基本掌握' },
    { id: 'EDU-004', disease: '慢阻肺', content: '戒烟及避免二手烟', method: '书面', educator: '呼吸科-刘医生', mastery: '未掌握' },
    { id: 'EDU-005', disease: '术后康复', content: '按时服用抗凝药，定期复查 INR', method: '口头', educator: '普外科-陈医生', mastery: '完全掌握' },
  ];

  return json(ok({ educations, totalCount: educations.length }));
}

/**
 * GET /api/v1/staff/schedule
 * 科室排班表
 */
async function handleStaffSchedule(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const schedule = {
    dept: '心内科',
    week: '2026-W43 (10.20-10.26)',
    doctors: [
      { name: '李主任', mon: '白班', tue: '白班', wed: '休息', thu: '白班', fri: '白班', sat: '休息', sun: '休息', status: '在岗' },
      { name: '王医生', mon: '夜班', tue: '夜班', wed: '白班', thu: '白班', fri: '休息', sat: '白班', sun: '白班', status: '在岗' },
      { name: '张医生', mon: '白班', tue: '休息', wed: '夜班', thu: '夜班', fri: '白班', sat: '白班', sun: '休息', status: '在岗' },
      { name: '刘医生', mon: '休息', tue: '白班', wed: '白班', thu: '休息', fri: '夜班', sat: '夜班', sun: '白班', status: '在岗' },
      { name: '陈医生', mon: '白班', tue: '白班', wed: '白班', thu: '白班', fri: '白班', sat: '休息', sun: '休息', status: '在岗' },
    ],
  };

  return json(ok(schedule));
}

/**
 * GET /api/v1/staff/attendance
 * 考勤统计
 */
async function handleStaffAttendance(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    period: '2026-10',
    totalStaff: 156,
    avgAttendanceDays: 21.5,
    totalLeaveDays: 45,
    totalOvertimeHours: 320,
    lateCount: 12,
    onRate: '96.8%',
  }));
}

export const m201Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/patient/complaints', handle: handleComplaints, auth: true },
  { method: 'GET', path: '/api/v1/patient/followups', handle: handleFollowups, auth: true },
  { method: 'GET', path: '/api/v1/patient/education', handle: handleEducation, auth: true },
  { method: 'GET', path: '/api/v1/staff/schedule', handle: handleStaffSchedule, auth: true },
  { method: 'GET', path: '/api/v1/staff/attendance', handle: handleStaffAttendance, auth: true },
];
