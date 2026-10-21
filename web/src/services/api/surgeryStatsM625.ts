/**
 * 健澜科技 jlmedaios - 手术量统计 API（M625，P13 管理驾驶舱）
 *
 * 对接 BFF：GET /api/v1/stats/surgery（未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface SurgeryStats {
  todayCount: number;
  weekCount: number;
  monthCount: number;
  gradeDist: Array<{ grade: string; count: number }>;
  surgeonRank: Array<{ surgeonCode: string; surgeonName: string; count: number }>;
}

const DEMO_STATS: SurgeryStats = {
  todayCount: 32,
  weekCount: 198,
  monthCount: 786,
  gradeDist: [
    { grade: 'I级', count: 210 },
    { grade: 'II级', count: 340 },
    { grade: 'III级', count: 186 },
    { grade: 'IV级', count: 50 },
  ],
  surgeonRank: [
    { surgeonCode: 'DOC-001', surgeonName: '陈主任', count: 42 },
    { surgeonCode: 'DOC-002', surgeonName: '刘医师', count: 35 },
    { surgeonCode: 'DOC-003', surgeonName: '王医师', count: 28 },
    { surgeonCode: 'DOC-004', surgeonName: '赵医师', count: 18 },
  ],
};

export async function fetchSurgeryStats(): Promise<SurgeryStats & { demo: boolean }> {
  try {
    const res = await get<SurgeryStats>('/stats/surgery');
    return { ...res, demo: false };
  } catch {
    return { ...DEMO_STATS, demo: true };
  }
}
