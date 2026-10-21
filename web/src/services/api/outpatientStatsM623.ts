/**
 * 健澜科技 jlmedaios - 门诊量统计 API（M623，P13 管理驾驶舱）
 *
 * 对接 BFF：GET /api/v1/stats/outpatient（未注册则 DEMO 兜底，打标 demo:true）。
 * 返回：今日/本周/本月门诊量 + 科室排名 + 近 7 日趋势。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface OutpatientStats {
  todayCount: number;
  weekCount: number;
  monthCount: number;
  deptRank: Array<{ deptCode: string; deptName: string; count: number }>;
  trend: Array<{ date: string; count: number }>;
}

const DEMO_STATS: OutpatientStats = {
  todayCount: 1286,
  weekCount: 8452,
  monthCount: 35210,
  deptRank: [
    { deptCode: 'DEPT-INT', deptName: '心内科', count: 186 },
    { deptCode: 'DEPT-OUT', deptName: '呼吸科', count: 142 },
    { deptCode: 'DEPT-GI', deptName: '消化科', count: 128 },
    { deptCode: 'DEPT-PED', deptName: '儿科', count: 210 },
    { deptCode: 'DEPT-DERM', deptName: '皮肤科', count: 96 },
  ],
  trend: [
    { date: '2026-10-16', count: 1150 },
    { date: '2026-10-17', count: 1210 },
    { date: '2026-10-18', count: 620 },
    { date: '2026-10-19', count: 1320 },
    { date: '2026-10-20', count: 1290 },
    { date: '2026-10-21', count: 1316 },
    { date: '2026-10-22', count: 1286 },
  ],
};

export async function fetchOutpatientStats(): Promise<OutpatientStats & { demo: boolean }> {
  try {
    const res = await get<OutpatientStats>('/stats/outpatient');
    return { ...res, demo: false };
  } catch {
    return { ...DEMO_STATS, demo: true };
  }
}
