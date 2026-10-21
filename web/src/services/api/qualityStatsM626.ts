/**
 * 健澜科技 jlmedaios - 医疗质量指标 API（M626，P13 管理驾驶舱）
 *
 * 对接 BFF：GET /api/v1/stats/quality（未注册则 DEMO 兜底，打标 demo:true）。
 * 达标口径：avgLOS ≤ targetAvgLOS；cureRate ≥ targetCureRate；bedTurnover ≥ targetBedTurnover。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface QualityStats {
  avgLOS: number;
  targetAvgLOS: number;
  preopLOS: number;
  bedTurnover: number;
  targetBedTurnover: number;
  cureRatePct: number;
  targetCureRatePct: number;
  deptQuality: Array<{ deptCode: string; deptName: string; score: number; cureRatePct: number }>;
}

const DEMO_STATS: QualityStats = {
  avgLOS: 8.6,
  targetAvgLOS: 9,
  preopLOS: 2.1,
  bedTurnover: 32.5,
  targetBedTurnover: 30,
  cureRatePct: 92.4,
  targetCureRatePct: 90,
  deptQuality: [
    { deptCode: 'DEPT-INT', deptName: '心内科', score: 95, cureRatePct: 94 },
    { deptCode: 'DEPT-SURG', deptName: '普外科', score: 90, cureRatePct: 91 },
    { deptCode: 'DEPT-ORTH', deptName: '骨科', score: 86, cureRatePct: 88 },
    { deptCode: 'DEPT-PED', deptName: '儿科', score: 93, cureRatePct: 96 },
    { deptCode: 'DEPT-EMG', deptName: '急诊科', score: 78, cureRatePct: 82 },
  ],
};

export async function fetchQualityStats(): Promise<QualityStats & { demo: boolean }> {
  try {
    const res = await get<QualityStats>('/stats/quality');
    return { ...res, demo: false };
  } catch {
    return { ...DEMO_STATS, demo: true };
  }
}
