/**
 * 健澜科技 jlmedaios - 患者 360 视图
 *
 * 整合门诊/住院/检验/检查/用药/手术/护理为统一时间轴。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/**
 * GET /api/v1/patient/360/:patientId
 * 患者 360 时间线
 */
async function handlePatient360(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const patientId = c.params?.patientId ?? 'P001';

  // DEMO 种子：张演示的完整就诊时间线 8 条事件
  const timeline = [
    {
      date: '2026-10-12',
      type: 'outpatient',
      title: '心内科门诊',
      description: '主诉：胸闷3天，诊断：冠心病待排',
    },
    {
      date: '2026-10-13',
      type: 'exam',
      title: '心电图检查',
      description: '窦性心律，ST-T 改变',
    },
    {
      date: '2026-10-14',
      type: 'lab',
      title: '血脂四项',
      description: '总胆固醇 6.2, LDL 3.8（偏高）',
    },
    {
      date: '2026-10-15',
      type: 'admission',
      title: '入院治疗',
      description: '收入心内科一病区 3 床',
    },
    {
      date: '2026-10-15',
      type: 'lab',
      title: '血常规',
      description: 'WBC 7.5, Hb 130, PLT 220',
    },
    {
      date: '2026-10-16',
      type: 'medication',
      title: '开始用药',
      description: '阿司匹林 100mg qd + 阿托伐他汀 20mg qn',
    },
    {
      date: '2026-10-17',
      type: 'vitals',
      title: '生命体征监测',
      description: '体温 36.5℃，血压 120/80mmHg，心率 78 次/分',
    },
    {
      date: '2026-10-18',
      type: 'discharge',
      title: '出院',
      description: '好转出院，带药 7 天，门诊随访',
    },
  ];

  const result = {
    patientId,
    patientName: '张演示',
    timeline,
    totalEvents: timeline.length,
    dateRange: {
      start: '2026-10-12',
      end: '2026-10-18',
    },
  };

  return json(ok(result));
}

export const patient360Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient/360/:patientId',
    handle: handlePatient360,
    auth: true,
  },
];
