/**
 * 健澜科技 jlmedaios - M253 BI 大屏 + 智慧服务扩展
 *
 * 床位使用率/吞吐量/满意度 + 预约挂号/智能导诊/患者反馈
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、BI 大屏 ==================== */

/** GET /api/v1/bi/bed-occupancy - 床位使用率 */
async function handleBiBedOccupancy(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const occupancy = [
    { department: '心内科', totalBeds: 40, inHospital: 38, occupancyRate: '95%', emptyBeds: 2 },
    { department: '内分泌科', totalBeds: 30, inHospital: 25, occupancyRate: '83%', emptyBeds: 5 },
    { department: '骨科', totalBeds: 35, inHospital: 30, occupancyRate: '86%', emptyBeds: 5 },
    { department: '急诊医学科', totalBeds: 12, inHospital: 10, occupancyRate: '83%', emptyBeds: 2 },
    { department: '呼吸内科', totalBeds: 30, inHospital: 28, occupancyRate: '93%', emptyBeds: 2 },
  ];

  return json(ok({ occupancy, totalBeds: 147, totalInHospital: 131, overallRate: '89%' }));
}

/** GET /api/v1/bi/throughput - 门诊住院量 */
async function handleBiThroughput(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const throughput = {
    dailyTrend: [
      { date: '2026-10-14', outpatient: 2450, inpatientAdmit: 62 },
      { date: '2026-10-15', outpatient: 2680, inpatientAdmit: 68 },
      { date: '2026-10-16', outpatient: 2590, inpatientAdmit: 65 },
      { date: '2026-10-17', outpatient: 2200, inpatientAdmit: 55 },
      { date: '2026-10-18', outpatient: 1850, inpatientAdmit: 48 },
      { date: '2026-10-19', outpatient: 1780, inpatientAdmit: 45 },
      { date: '2026-10-20', outpatient: 2720, inpatientAdmit: 70 },
    ],
    weeklyAvg: { outpatient: 2324, inpatientAdmit: 59 },
    monthlyAvg: { outpatient: 2410, inpatientAdmit: 62 },
    yoyGrowthRate: '+8.5%',
    momGrowthRate: '+3.2%',
  };

  return json(ok(throughput));
}

/** GET /api/v1/bi/satisfaction - 患者满意度 */
async function handleBiSatisfaction(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const satisfaction = [
    { department: '心内科', score: 96.5, complaints: 2, praises: 18, rank: 1 },
    { department: '内分泌科', score: 94.2, complaints: 3, praises: 12, rank: 3 },
    { department: '骨科', score: 93.8, complaints: 4, praises: 10, rank: 4 },
    { department: '急诊医学科', score: 91.5, complaints: 8, praises: 6, rank: 6 },
    { department: '呼吸内科', score: 95.1, complaints: 2, praises: 14, rank: 2 },
  ];

  return json(ok({ satisfaction, overallScore: 94.2, totalComplaints: 19, totalPraises: 60 }));
}

/* ==================== 二、智慧服务 ==================== */

/** GET /api/v1/smart-service/appointment - 预约挂号统计 */
async function handleSmartServiceAppointment(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const appointment = {
    todayAppointments: 486,
    weekAppointments: 3120,
    monthAppointments: 12850,
    departmentDistribution: [
      { department: '心内科', count: 98, pct: '20.2%' },
      { department: '呼吸内科', count: 72, pct: '14.8%' },
      { department: '内分泌科', count: 65, pct: '13.4%' },
      { department: '骨科', count: 58, pct: '11.9%' },
      { department: '全科', count: 45, pct: '9.3%' },
    ],
  };

  return json(ok(appointment));
}

/** GET /api/v1/smart-service/guide - 智能导诊统计 */
async function handleSmartServiceGuide(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const guide = {
    totalGuides: 2350,
    topDepartments: [
      { department: '心内科', count: 420, pct: '17.9%' },
      { department: '呼吸内科', count: 380, pct: '16.2%' },
      { department: '消化内科', count: 310, pct: '13.2%' },
    ],
    accuracyRate: '92.5%',
    satisfactionScore: 4.6,
  };

  return json(ok(guide));
}

/** GET /api/v1/smart-service/feedback - 患者反馈 5 条 */
async function handleSmartServiceFeedback(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const feedback = [
    { id: 'FB-001', patient: '王***', type: '表扬', content: '心内科李医生态度很好，解释病情很耐心', time: '2026-10-20 10:30', status: '已处理' },
    { id: 'FB-002', patient: '李***', type: '投诉', content: '急诊等待时间过长，候诊 2 小时', time: '2026-10-20 09:15', status: '处理中' },
    { id: 'FB-003', patient: '张***', type: '建议', content: '建议增加门诊自助机数量', time: '2026-10-19 14:20', status: '已处理' },
    { id: 'FB-004', patient: '赵***', type: '表扬', content: '护士站刘护士专业又细心', time: '2026-10-19 11:00', status: '已处理' },
    { id: 'FB-005', patient: '陈***', type: '投诉', content: '停车场入口拥堵，建议优化', time: '2026-10-18 16:45', status: '已回复' },
  ];

  return json(ok({ feedback, totalCount: feedback.length }));
}

export const m253Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/bi/bed-occupancy', handle: handleBiBedOccupancy, auth: true },
  { method: 'GET', path: '/api/v1/bi/throughput', handle: handleBiThroughput, auth: true },
  { method: 'GET', path: '/api/v1/bi/satisfaction', handle: handleBiSatisfaction, auth: true },
  { method: 'GET', path: '/api/v1/smart-service/appointment', handle: handleSmartServiceAppointment, auth: true },
  { method: 'GET', path: '/api/v1/smart-service/guide', handle: handleSmartServiceGuide, auth: true },
  { method: 'GET', path: '/api/v1/smart-service/feedback', handle: handleSmartServiceFeedback, auth: true },
];
