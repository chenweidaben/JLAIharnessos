/**
 * 健澜科技 jlmedaios - 患者端智慧服务
 *
 * 用药交代 / 预约提醒 / 报告推送 / 满意度调查
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/**
 * GET /api/v1/patient/medication-adherence
 * 用药交代
 */
async function handleMedicationAdherence(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const medications = [
    {
      drug: '阿司匹林',
      dose: '100mg',
      frequency: '每天早上 1 片',
      instruction: '饭后服用，避免空腹',
      reminder: '今日 08:00 已提醒',
    },
    {
      drug: '阿托伐他汀',
      dose: '20mg',
      frequency: '每晚 1 片',
      instruction: '睡前服用，定期监测肝功能',
      reminder: '今晚 21:00 将提醒',
    },
    {
      drug: '依那普利',
      dose: '5mg',
      frequency: '每天早上 1 片',
      instruction: '监测血压变化',
      reminder: '今日 08:00 已提醒',
    },
    {
      drug: '铝碳酸镁',
      dose: '1 粒',
      frequency: '每天 3 次',
      instruction: '饭前半小时嚼服',
      reminder: '今日 11:30 / 17:30 将提醒',
    },
  ];

  return json(ok({ medications, totalCount: medications.length }));
}

/**
 * GET /api/v1/patient/appointment-reminders
 * 预约提醒
 */
async function handleAppointmentReminders(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const appointments = [
    {
      type: '门诊',
      department: '心内科',
      doctor: '李医生',
      datetime: '2026-10-25 09:00',
      location: '门诊楼 3 楼',
      status: '待就诊',
    },
    {
      type: '检验',
      department: '检验科',
      doctor: '—',
      datetime: '2026-10-22 08:00',
      location: '门诊楼 2 楼',
      status: '待就诊',
    },
    {
      type: '检查',
      department: '心脏超声',
      doctor: '王医生',
      datetime: '2026-10-28 10:00',
      location: '门诊楼 4 楼',
      status: '待就诊',
    },
  ];

  return json(ok({ appointments, totalCount: appointments.length }));
}

/**
 * GET /api/v1/patient/report-notifications
 * 报告推送
 */
async function handleReportNotifications(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const reports = [
    {
      title: '血常规报告',
      date: '2026-10-18',
      status: '已出',
      url: '/reports/lab/CBC-001',
    },
    {
      title: '心电图报告',
      date: '2026-10-18',
      status: '已出',
      url: '/reports/exam/ECG-001',
    },
    {
      title: '心脏超声报告',
      date: '2026-10-19',
      status: '已出',
      url: '/reports/exam/ECHO-001',
    },
  ];

  return json(ok({ reports, totalCount: reports.length }));
}

/**
 * GET /api/v1/patient/satisfaction
 * 满意度调查
 */
async function handleSatisfaction(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const survey = {
    title: '住院患者满意度调查',
    period: '2026-Q3',
    questions: [
      { name: '医生沟通满意度', maxScore: 5, avgScore: 4.5 },
      { name: '护士服务满意度', maxScore: 5, avgScore: 4.3 },
      { name: '等候时间满意度', maxScore: 5, avgScore: 3.8 },
      { name: '环境设施满意度', maxScore: 5, avgScore: 4.0 },
      { name: '总体满意度', maxScore: 5, avgScore: 4.2 },
    ],
    stats: {
      totalResponses: 45,
      overallAvg: 4.2,
      responseRate: '85%',
    },
  };

  return json(ok(survey));
}

export const patientServiceRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient/medication-adherence',
    handle: handleMedicationAdherence,
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/patient/appointment-reminders',
    handle: handleAppointmentReminders,
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/patient/report-notifications',
    handle: handleReportNotifications,
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/patient/satisfaction',
    handle: handleSatisfaction,
    auth: true,
  },
];
