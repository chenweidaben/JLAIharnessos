/**
 * 健澜科技 jlmedaios - 药占比/耗占比 API（M627，P13 管理驾驶舱）
 *
 * 对接 BFF：GET /api/v1/stats/drug-ratio（未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface DrugRatioStats {
  drugRatioPct: number;
  consumableRatioPct: number;
  examRatioPct: number;
  deptRank: Array<{ deptCode: string; deptName: string; drugRatioPct: number }>;
  trend: Array<{ month: string; drugRatioPct: number }>;
}

const DEMO_STATS: DrugRatioStats = {
  drugRatioPct: 38.6,
  consumableRatioPct: 22.4,
  examRatioPct: 15.2,
  deptRank: [
    { deptCode: 'DEPT-INT', deptName: '心内科', drugRatioPct: 45.2 },
    { deptCode: 'DEPT-PED', deptName: '儿科', drugRatioPct: 42.0 },
    { deptCode: 'DEPT-RESP', deptName: '呼吸科', drugRatioPct: 38.5 },
    { deptCode: 'DEPT-SURG', deptName: '普外科', drugRatioPct: 28.6 },
    { deptCode: 'DEPT-ORTH', deptName: '骨科', drugRatioPct: 24.0 },
  ],
  trend: [
    { month: '2026-07', drugRatioPct: 41.2 },
    { month: '2026-08', drugRatioPct: 40.0 },
    { month: '2026-09', drugRatioPct: 39.1 },
    { month: '2026-10', drugRatioPct: 38.6 },
  ],
};

export async function fetchDrugRatioStats(): Promise<DrugRatioStats & { demo: boolean }> {
  try {
    const res = await get<DrugRatioStats>('/stats/drug-ratio');
    return { ...res, demo: false };
  } catch {
    return { ...DEMO_STATS, demo: true };
  }
}
