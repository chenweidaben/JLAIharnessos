/**
 * 健澜科技 jlmedaios - 运营总览大屏 API（M490）
 * 对接 BFF ：
 *   /dashboard/stats            全局统计
 *   /operation/daily-visits     今日门急诊
 *   /quality/emr-grade5-items   五级项目概览
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface DashboardStats {
  inHospital: number;
  todayOperations: number;
  bedOccupancy: number; // %
  demo?: boolean;
}

export interface DailyVisits {
  todayOutpatient: number;
  todayEmergency: number;
  trend7d: { date: string; outpatient: number; emergency: number }[];
  demo?: boolean;
}

export interface Grade5Overview {
  total: number;
  passed: number;
  rate: number; // %
  demo?: boolean;
}

export interface DeptBedRow {
  id: string;
  dept: string;
  rate: number; // %
  demo?: boolean;
}

const DEMO_STATS: DashboardStats = {
  inHospital: 1864,
  todayOperations: 42,
  bedOccupancy: 84.7,
  demo: true,
};

const DEMO_VISITS: DailyVisits = {
  todayOutpatient: 3286,
  todayEmergency: 412,
  trend7d: [
    { date: '10-14', outpatient: 2860, emergency: 380 },
    { date: '10-15', outpatient: 3120, emergency: 402 },
    { date: '10-16', outpatient: 3280, emergency: 425 },
    { date: '10-17', outpatient: 2650, emergency: 390 },
    { date: '10-18', outpatient: 1820, emergency: 310 },
    { date: '10-19', outpatient: 3100, emergency: 405 },
    { date: '10-20', outpatient: 3286, emergency: 412 },
  ],
  demo: true,
};

const DEMO_GRADE5: Grade5Overview = {
  total: 215,
  passed: 169,
  rate: 78.6,
  demo: true,
};

const DEMO_DEPTS: DeptBedRow[] = [
  { id: 'd-1', dept: '心内科', rate: 96.2, demo: true },
  { id: 'd-2', dept: '普外科', rate: 92.5, demo: true },
  { id: 'd-3', dept: '神经内科', rate: 88.4, demo: true },
  { id: 'd-4', dept: '呼吸内科', rate: 85.1, demo: true },
  { id: 'd-5', dept: '综合 ICU', rate: 98.6, demo: true },
  { id: 'd-6', dept: '骨科', rate: 82.3, demo: true },
  { id: 'd-7', dept: '妇产科', rate: 76.5, demo: true },
  { id: 'd-8', dept: '儿科', rate: 68.2, demo: true },
];

async function safeGetSingle<T>(url: string, fallback: T): Promise<{ data: T; demo: boolean }> {
  try {
    const res = await get<T & { demo?: boolean }>(url);
    if (res && typeof res === 'object') return { data: res, demo: false };
    return { data: fallback, demo: true };
  } catch {
    return { data: fallback, demo: true };
  }
}

export const fetchDashboardStats = () =>
  safeGetSingle<DashboardStats>('/dashboard/stats', DEMO_STATS);
export const fetchOperationDaily = () =>
  safeGetSingle<DailyVisits>('/operation/daily-visits', DEMO_VISITS);
export const fetchQualityOverview = () =>
  safeGetSingle<Grade5Overview>('/quality/emr-grade5-items', DEMO_GRADE5);
export const fetchDeptBeds = (): Promise<{ data: DeptBedRow[]; demo: boolean }> =>
  Promise.resolve({ data: DEMO_DEPTS, demo: true });
