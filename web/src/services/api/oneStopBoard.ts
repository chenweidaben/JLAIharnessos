/**
 * 健澜科技 jlmedaios - 门诊一站式服务看板 API（M505）
 * 对接 BFF /api/v1/one-stop/* ：
 *   /one-stop/service    服务事项
 *   /one-stop/counter    窗口状态
 *   /one-stop/satisfaction 满意度
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface ServiceRow {
  id: string;
  name: string;
  category: 'consult' | 'guide' | 'stamp' | 'refund' | 'copy' | 'insurance';
  counter: string;
  avgMinutes: number;
  demo?: boolean;
}

export interface CounterRow {
  id: string;
  no: string;
  service: string;
  status: 'open' | 'busy' | 'closed' | 'serving';
  queue: number;
  demo?: boolean;
}

export interface SatisfactionStats {
  todayCount: number;
  avgMinutes: number;
  openRate: number; // %
  satisfaction: number; // %
  demo?: boolean;
}

const DEMO_SERVICE: ServiceRow[] = [
  { id: 'sv-1', name: '门诊咨询', category: 'consult', counter: '1-3 号窗口', avgMinutes: 3, demo: true },
  { id: 'sv-2', name: '导诊服务', category: 'guide', counter: '导诊台', avgMinutes: 2, demo: true },
  { id: 'sv-3', name: '诊断证明盖章', category: 'stamp', counter: '5-6 号窗口', avgMinutes: 5, demo: true },
  { id: 'sv-4', name: '退费办理', category: 'refund', counter: '8-10 号窗口', avgMinutes: 12, demo: true },
  { id: 'sv-5', name: '病历复印', category: 'copy', counter: '病案室窗口', avgMinutes: 8, demo: true },
  { id: 'sv-6', name: '医保结算', category: 'insurance', counter: '11-15 号窗口', avgMinutes: 6, demo: true },
];

const DEMO_COUNTER: CounterRow[] = [
  { id: 'ct-1', no: '01', service: '门诊咨询', status: 'open', queue: 2, demo: true },
  { id: 'ct-2', no: '05', service: '诊断证明盖章', status: 'serving', queue: 0, demo: true },
  { id: 'ct-3', no: '08', service: '退费办理', status: 'busy', queue: 6, demo: true },
  { id: 'ct-4', no: '12', service: '医保结算', status: 'open', queue: 3, demo: true },
  { id: 'ct-5', no: '16', service: '复印', status: 'closed', queue: 0, demo: true },
];

const DEMO_STATS: SatisfactionStats = {
  todayCount: 1280,
  avgMinutes: 6.5,
  openRate: 92.0,
  satisfaction: 96.2,
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

export const fetchService = () => safeGet<ServiceRow>('/one-stop/service', DEMO_SERVICE);
export const fetchCounter = () => safeGet<CounterRow>('/one-stop/counter', DEMO_COUNTER);
export const fetchSatisfaction = () =>
  safeGetSingle<SatisfactionStats>('/one-stop/satisfaction', DEMO_STATS);
