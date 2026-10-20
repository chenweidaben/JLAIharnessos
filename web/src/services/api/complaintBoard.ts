/**
 * 健澜科技 jlmedaios - 医疗投诉处理看板 API（M505）
 * 对接 BFF /api/v1/complaint/* ：
 *   /complaint/list   投诉列表
 *   /complaint/handle 处理记录
 *   /complaint/stats 投诉统计
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface ComplaintRow {
  id: string;
  complainant: string;
  dept: string;
  type: 'serviceAttitude' | 'medicalQuality' | 'billing' | 'ethics' | 'environment';
  status: 'pending' | 'processing' | 'resolved' | 'unsatisfied';
  demo?: boolean;
}

export interface HandleRow {
  id: string;
  complaintNo: string;
  handler: string;
  hours: number;
  result: 'satisfied' | 'basic' | 'unsatisfied';
  demo?: boolean;
}

export interface ComplaintStats {
  monthlyCount: number;
  resolvedRate: number; // %
  satisfaction: number; // %
  avgHours: number;
  demo?: boolean;
}

const DEMO_LIST: ComplaintRow[] = [
  { id: 'cp-1', complainant: '张**', dept: '心内科', type: 'serviceAttitude', status: 'processing', demo: true },
  { id: 'cp-2', complainant: '李**', dept: '普外科', type: 'medicalQuality', status: 'pending', demo: true },
  { id: 'cp-3', complainant: '王**', dept: '收费处', type: 'billing', status: 'resolved', demo: true },
  { id: 'cp-4', complainant: '赵**', dept: '儿科', type: 'ethics', status: 'unsatisfied', demo: true },
  { id: 'cp-5', complainant: '钱**', dept: '门诊部', type: 'environment', status: 'resolved', demo: true },
];

const DEMO_HANDLE: HandleRow[] = [
  { id: 'hd-1', complaintNo: 'TS-2026-1001', handler: '王主任', hours: 12, result: 'satisfied', demo: true },
  { id: 'hd-2', complaintNo: 'TS-2026-1002', handler: '李科长', hours: 48, result: 'basic', demo: true },
  { id: 'hd-3', complaintNo: 'TS-2026-1003', handler: '赵书记', hours: 96, result: 'unsatisfied', demo: true },
];

const DEMO_STATS: ComplaintStats = {
  monthlyCount: 32,
  resolvedRate: 87.5,
  satisfaction: 82.0,
  avgHours: 36.5,
  demo: true,
};

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

async function safeGetSingle<T>(url: string, fallback: T): Promise<{ data: T; demo: boolean }> {
  try {
    const res = await get<T & { demo?: boolean }>(url);
    if (res && typeof res === 'object') return { data: res, demo: false };
    return { data: fallback, demo: true };
  } catch {
    return { data: fallback, demo: true };
  }
}

export const fetchList = () => safeGet<ComplaintRow>('/complaint/list', DEMO_LIST);
export const fetchHandle = () => safeGet<HandleRow>('/complaint/handle', DEMO_HANDLE);
export const fetchStats = () => safeGetSingle<ComplaintStats>('/complaint/stats', DEMO_STATS);
