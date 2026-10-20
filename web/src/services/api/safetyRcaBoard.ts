/**
 * 健澜科技 jlmedaios - 患者安全事件与 RCA 根因分析看板 API（M515）
 * 对接 BFF /api/v1/safety/* ：
 *   /safety/events       安全事件
 *   /safety/rca          RCA 根因
 *   /safety/rectification 整改追踪
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface SafetyEventRow {
  id: string;
  type: 'fall' | 'pressureUlcer' | 'medError' | 'tubeDisplacement' | 'fallBed';
  severity: 'level1' | 'level2' | 'level3' | 'level4';
  dept: string;
  reportedAt: string;
  demo?: boolean;
}

export interface RcaRow {
  id: string;
  eventNo: string;
  status: 'pending' | 'analyzing' | 'completed';
  rootCause: 'man' | 'machine' | 'material' | 'method' | 'environment';
  rectificationCount: number;
  demo?: boolean;
}

export interface RectificationRow {
  id: string;
  measure: string;
  dept: string;
  status: 'ongoing' | 'completed' | 'overdue';
  completeRate: number; // %
  demo?: boolean;
}

export interface SafetyStats {
  monthlyEvents: number;
  rcaCompletionRate: number; // %
  rectificationCompletionRate: number; // %
  overdueRectification: number;
  demo?: boolean;
}

const DEMO_EVENTS: SafetyEventRow[] = [
  { id: 'ev-1', type: 'fall', severity: 'level2', dept: '老年病房', reportedAt: '2026-10-12 09:30', demo: true },
  { id: 'ev-2', type: 'pressureUlcer', severity: 'level3', dept: 'ICU', reportedAt: '2026-10-13 14:00', demo: true },
  { id: 'ev-3', type: 'medError', severity: 'level4', dept: '普外科', reportedAt: '2026-10-14 11:15', demo: true },
  { id: 'ev-4', type: 'tubeDisplacement', severity: 'level2', dept: '神经内科', reportedAt: '2026-10-15 16:45', demo: true },
  { id: 'ev-5', type: 'fallBed', severity: 'level1', dept: '儿科', reportedAt: '2026-10-16 08:20', demo: true },
];

const DEMO_RCA: RcaRow[] = [
  { id: 'rca-1', eventNo: 'SA-2026-1001', status: 'completed', rootCause: 'man', rectificationCount: 3, demo: true },
  { id: 'rca-2', eventNo: 'SA-2026-1002', status: 'analyzing', rootCause: 'method', rectificationCount: 2, demo: true },
  { id: 'rca-3', eventNo: 'SA-2026-1003', status: 'pending', rootCause: 'machine', rectificationCount: 0, demo: true },
];

const DEMO_RECT: RectificationRow[] = [
  { id: 'rt-1', measure: '加强跌倒风险评估培训', dept: '老年病房', status: 'completed', completeRate: 100, demo: true },
  { id: 'rt-2', measure: '升级床栏防坠床装置', dept: '儿科', status: 'ongoing', completeRate: 80, demo: true },
  { id: 'rt-3', measure: '优化医嘱核对流程', dept: '普外科', status: 'overdue', completeRate: 60, demo: true },
];

const DEMO_STATS: SafetyStats = {
  monthlyEvents: 12,
  rcaCompletionRate: 75.0,
  rectificationCompletionRate: 88.5,
  overdueRectification: 2,
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

export const fetchEvents = () => safeGet<SafetyEventRow>('/safety/events', DEMO_EVENTS);
export const fetchRca = () => safeGet<RcaRow>('/safety/rca', DEMO_RCA);
export const fetchRectification = () => safeGet<RectificationRow>('/safety/rectification', DEMO_RECT);
export const fetchSafetyStats = () => safeGetSingle<SafetyStats>('/safety/stats', DEMO_STATS);
