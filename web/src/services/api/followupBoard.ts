/**
 * 健澜科技 jlmedaios - 患者随访看板 API（M492）
 * 对接 BFF ：
 *   /patient/followup-plan      随访计划
 *   /patient/followup-result    随访结果
 *   /quality/readmission-30d   30 天再入院
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface PlanRow {
  id: string;
  disease: string;
  cycle: string;
  owner: string;
  completionRate: number; // %
  demo?: boolean;
}

export interface ResultRow {
  id: string;
  mrn: string;
  name: string;
  outcome: 'alive' | 'improved' | 'dead' | 'lost';
  followupAt: string;
  demo?: boolean;
}

export interface ReadmissionRow {
  id: string;
  dept: string;
  discharges: number;
  readmissions: number;
  rate: number; // %
  demo?: boolean;
}

const DEMO_PLANS: PlanRow[] = [
  { id: 'pl-1', disease: '急性心梗', cycle: '出院后 1/3/6/12 月', owner: '心内科-王**', completionRate: 92.5, demo: true },
  { id: 'pl-2', disease: '脑卒中', cycle: '出院后 2/6/12 周', owner: '神经内科-李**', completionRate: 88.2, demo: true },
  { id: 'pl-3', disease: '糖尿病', cycle: '每月 1 次', owner: '内分泌科-赵**', completionRate: 85.6, demo: true },
  { id: 'pl-4', disease: '肿瘤化疗后', cycle: '每疗程结束后 2 周', owner: '肿瘤科-陈**', completionRate: 78.4, demo: true },
  { id: 'pl-5', disease: '髋关节置换术后', cycle: '出院后 2/6/12 月', owner: '骨科-周**', completionRate: 95.1, demo: true },
];

const DEMO_RESULTS: ResultRow[] = [
  { id: 'r-1', mrn: 'ZY202608001', name: '张**', outcome: 'improved', followupAt: '2026-10-15', demo: true },
  { id: 'r-2', mrn: 'ZY202608002', name: '李**', outcome: 'alive', followupAt: '2026-10-16', demo: true },
  { id: 'r-3', mrn: 'ZY202608003', name: '王**', outcome: 'dead', followupAt: '2026-10-12', demo: true },
  { id: 'r-4', mrn: 'ZY202608004', name: '赵**', outcome: 'lost', followupAt: '2026-10-10', demo: true },
  { id: 'r-5', mrn: 'ZY202608005', name: '孙**', outcome: 'improved', followupAt: '2026-10-18', demo: true },
];

const DEMO_READMIT: ReadmissionRow[] = [
  { id: 'ra-1', dept: '心内科', discharges: 420, readmissions: 28, rate: 6.67, demo: true },
  { id: 'ra-2', dept: '呼吸内科', discharges: 380, readmissions: 32, rate: 8.42, demo: true },
  { id: 'ra-3', dept: '神经内科', discharges: 260, readmissions: 18, rate: 6.92, demo: true },
  { id: 'ra-4', dept: '肿瘤科', discharges: 180, readmissions: 22, rate: 12.22, demo: true },
  { id: 'ra-5', dept: '普外科', discharges: 320, readmissions: 12, rate: 3.75, demo: true },
];

async function safeGet<T>(url: string, fallback: T[]): Promise<{ data: T[]; demo: boolean }> {
  try {
    const res = await get<{ items?: T[] } | T[]>(url);
    const items = Array.isArray(res) ? (res as T[]) : ((res as { items?: T[] })?.items ?? []);
    if (items.length > 0) return { data: items, demo: false };
    return { data: fallback, demo: true };
  } catch {
    return { data: fallback, demo: true };
  }
}

export const fetchPlan = () => safeGet<PlanRow>('/patient/followup-plan', DEMO_PLANS);
export const fetchResult = () => safeGet<ResultRow>('/patient/followup-result', DEMO_RESULTS);
export const fetchReadmission = () =>
  safeGet<ReadmissionRow>('/quality/readmission-30d', DEMO_READMIT);
