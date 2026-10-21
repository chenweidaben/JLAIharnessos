/**
 * 健澜科技 jlmedaios - 满意度统计 API（M618，P11 智慧服务）
 *
 * 对接 BFF：GET /api/v1/satisfaction/surveys/stats（未注册则 DEMO 兜底，打标 demo:true）。
 * 返回：overallScore / totalResponses / deptRank[] / trend[]。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface DeptRankRow {
  deptCode: string;
  deptName: string;
  score: number;
  responses: number;
}

export interface TrendPoint {
  date: string;
  score: number;
}

export interface SatisfactionStats {
  overallScore: number;
  totalResponses: number;
  excellentRate: number;
  deptRank: DeptRankRow[];
  trend: TrendPoint[];
}

const DEMO_STATS: SatisfactionStats = {
  overallScore: 4.62,
  totalResponses: 1245,
  excellentRate: 82.5,
  deptRank: [
    { deptCode: 'DEPT-INT', deptName: '心内科', score: 4.85, responses: 230 },
    { deptCode: 'DEPT-SURG', deptName: '普外科', score: 4.72, responses: 180 },
    { deptCode: 'DEPT-PED', deptName: '儿科', score: 4.61, responses: 210 },
    { deptCode: 'DEPT-EMG', deptName: '急诊科', score: 4.35, responses: 320 },
    { deptCode: 'DEPT-OBS', deptName: '产科', score: 4.55, responses: 150 },
  ],
  trend: [
    { date: '2026-08', score: 4.42 },
    { date: '2026-09', score: 4.55 },
    { date: '2026-10', score: 4.62 },
  ],
};

export async function fetchSatisfactionStats(): Promise<SatisfactionStats & { demo: boolean }> {
  try {
    const res = await get<SatisfactionStats>('/satisfaction/surveys/stats');
    return { ...res, demo: false };
  } catch {
    return { ...DEMO_STATS, demo: true };
  }
}
