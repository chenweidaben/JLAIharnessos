/**
 * 健澜科技 jlmedaios - M206 前端聚合接口
 *
 * 医生工作台 / 护士站 / 药房工作台
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/**
 * GET /api/v1/dashboard/doctor-workbench
 * 医生工作台聚合
 */
async function handleDoctorWorkbench(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    today: { pendingPatients: 15, surgeries: 3, pendingOrders: 8 },
    notifications: [
      { type: '危急值', message: '张演示 血钾 6.8mmol/L', time: '09:15' },
      { type: '会诊', message: '普外科请您会诊（术前心功能评估）', time: '09:30' },
      { type: '医嘱', message: '王患者长期医嘱今日到期', time: '10:00' },
    ],
  }));
}

/**
 * GET /api/v1/dashboard/nurse-station
 * 护士站聚合
 */
async function handleNurseStation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    today: { inWard: 45, pendingOrders: 22, pendingRecords: 6 },
    shiftReminders: [
      { type: '交班', message: '张演示 术后 6 小时，注意观察引流液', time: '14:00' },
      { type: '治疗', message: '李患者 15:00 抗生素皮试', time: '15:00' },
      { type: '护理', message: '王患者 压疮高危，建议 q2h 翻身', time: '持续' },
    ],
  }));
}

/**
 * GET /api/v1/dashboard/pharmacy
 * 药房工作台聚合
 */
async function handlePharmacyWorkbench(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    today: { pendingPrescriptions: 35, pendingReviews: 12, lowStockDrugs: 5, expiringDrugs: 3 },
  }));
}

export const m206Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/dashboard/doctor-workbench', handle: handleDoctorWorkbench, auth: true },
  { method: 'GET', path: '/api/v1/dashboard/nurse-station', handle: handleNurseStation, auth: true },
  { method: 'GET', path: '/api/v1/dashboard/pharmacy', handle: handlePharmacyWorkbench, auth: true },
];
