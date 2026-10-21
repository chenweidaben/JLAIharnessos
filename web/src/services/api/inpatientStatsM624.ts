/**
 * 健澜科技 jlmedaios - 住院床位统计 API（M624，P13 管理驾驶舱）
 *
 * 对接 BFF：GET /api/v1/stats/inpatient（未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface InpatientStats {
  totalBeds: number;
  occupiedBeds: number;
  occupancyRatePct: number;
  admittedToday: number;
  dischargedToday: number;
  deptBeds: Array<{ deptCode: string; deptName: string; total: number; occupied: number }>;
}

const DEMO_STATS: InpatientStats = {
  totalBeds: 800,
  occupiedBeds: 640,
  occupancyRatePct: 80,
  admittedToday: 46,
  dischargedToday: 38,
  deptBeds: [
    { deptCode: 'DEPT-INT', deptName: '心内科', total: 60, occupied: 54 },
    { deptCode: 'DEPT-SURG', deptName: '普外科', total: 80, occupied: 72 },
    { deptCode: 'DEPT-ORTH', deptName: '骨科', total: 50, occupied: 38 },
    { deptCode: 'DEPT-NEU', deptName: '神经内科', total: 45, occupied: 40 },
    { deptCode: 'DEPT-PED', deptName: '儿科', total: 40, occupied: 26 },
  ],
};

export async function fetchInpatientStats(): Promise<InpatientStats & { demo: boolean }> {
  try {
    const res = await get<InpatientStats>('/stats/inpatient');
    return { ...res, demo: false };
  } catch {
    return { ...DEMO_STATS, demo: true };
  }
}
