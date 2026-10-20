/**
 * 健澜科技 jlmedaios - 区域协同 + 互联网医院 + 危急值闭环
 *
 * M194-P0: 区域转诊 / 互联网问诊 / 危急值闭环
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/**
 * GET /api/v1/regional/referrals
 * 区域协同双向转诊
 */
async function handleReferrals(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const referrals = [
    { id: 'REF-001', direction: '上转', from: '社区卫生服务中心', to: '三甲医院-心内科', reason: '胸痛待查', status: '已接收' },
    { id: 'REF-002', direction: '下转', from: '三甲医院', to: '社区卫生服务中心', reason: '康复期随访', status: '已转出' },
    { id: 'REF-003', direction: '上转', from: '县医院', to: '三甲医院-ICU', reason: '重症肺炎', status: '已接收' },
    { id: 'REF-004', direction: '下转', from: '三甲医院', to: '社区卫生服务中心', reason: '病情稳定', status: '已转出' },
    { id: 'REF-005', direction: '上转', from: '社区卫生服务中心', to: '三甲医院-儿科', reason: '高热惊厥', status: '审核中' },
  ];

  return json(ok({ referrals, totalCount: referrals.length }));
}

/**
 * GET /api/v1/internet/consultations
 * 互联网医院问诊
 */
async function handleConsultations(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const consultations = [
    { id: 'CON-001', doctor: '李医生', dept: '心内科', date: '2026-10-18', status: '已回复', topic: '胸闷咨询' },
    { id: 'CON-002', doctor: '王医生', dept: '全科', date: '2026-10-19', status: '已回复', topic: '感冒用药咨询' },
    { id: 'CON-003', doctor: '张医生', dept: '皮肤科', date: '2026-10-19', status: '待回复', topic: '皮疹咨询' },
  ];

  return json(ok({ consultations, totalCount: consultations.length }));
}

/**
 * GET /api/v1/lab/critical-values
 * 危急值闭环
 */
async function handleCriticalValues(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const criticalValues = [
    { id: 'CV-001', item: '血钾', value: '6.8 mmol/L', level: 'high', status: '已处理', processedAt: '2026-10-19T09:15:00Z', notifiedDoctor: '李医生' },
    { id: 'CV-002', item: '血糖', value: '2.1 mmol/L', level: 'critical', status: '处理中', processedAt: null, notifiedDoctor: '王医生' },
    { id: 'CV-003', item: '肌钙蛋白', value: '0.5 ng/ml', level: 'critical', status: '未处理', processedAt: null, notifiedDoctor: null },
  ];

  return json(ok({ criticalValues, totalCount: criticalValues.length }));
}

export const regionalRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/regional/referrals', handle: handleReferrals, auth: true },
];

export const internetRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/internet/consultations', handle: handleConsultations, auth: true },
];

export const labCriticalRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/lab/critical-values', handle: handleCriticalValues, auth: true },
];
