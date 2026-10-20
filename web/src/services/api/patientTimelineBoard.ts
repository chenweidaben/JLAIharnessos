/**
 * 健澜科技 jlmedaios - 患者时间线看板 API（M508）
 * 对接 BFF /api/v1/timeline/* ：
 *   /timeline/events  时间线事件
 *   /timeline/summary 病程摘要
 *   /timeline/stats   时间线统计
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface TimelineEventRow {
  id: string;
  type: 'outpatient' | 'inpatient' | 'lab' | 'imaging' | 'medication' | 'surgery';
  timestamp: string;
  description: string;
  key: 'critical' | 'allergy' | 'surgery' | null;
  demo?: boolean;
}

export interface TimelineSummary {
  primaryDiagnosis: string;
  allergyHistory: string[];
  surgeryHistory: string;
  inpatientCount: number;
  demo?: boolean;
}

export interface TimelineStats {
  recent30dEvents: number;
  crossDeptEvents: number;
  keyEvents: number;
  primaryDiagnoses: number;
  demo?: boolean;
}

const DEMO_EVENTS: TimelineEventRow[] = [
  { id: 'e-1', type: 'outpatient', timestamp: '2026-09-25 09:12', description: '心内科门诊，血压 132/86mmHg', key: null, demo: true },
  { id: 'e-2', type: 'lab', timestamp: '2026-09-25 10:05', description: '血钾 5.8 mmol/L（危急值）', key: 'critical', demo: true },
  { id: 'e-3', type: 'medication', timestamp: '2026-09-26 08:00', description: '呋塞米 20mg po qd', key: null, demo: true },
  { id: 'e-4', type: 'imaging', timestamp: '2026-10-02 14:30', description: '胸部 CT：两肺纹理增多', key: null, demo: true },
  { id: 'e-5', type: 'inpatient', timestamp: '2026-10-08 10:00', description: '心内科入院（第 3 次住院）', key: null, demo: true },
  { id: 'e-6', type: 'surgery', timestamp: '2026-10-12 09:00', description: 'PCI 术（LAD 支架 1 枚）', key: 'surgery', demo: true },
];

const DEMO_SUMMARY: TimelineSummary = {
  primaryDiagnosis: '冠心病 不稳定型心绞痛',
  allergyHistory: ['青霉素过敏'],
  surgeryHistory: '2018 年阑尾切除术；2026-10-12 PCI 术',
  inpatientCount: 3,
  demo: true,
};

const DEMO_STATS: TimelineStats = {
  recent30dEvents: 42,
  crossDeptEvents: 18,
  keyEvents: 5,
  primaryDiagnoses: 2,
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

export const fetchEvents = () => safeGet<TimelineEventRow>('/timeline/events', DEMO_EVENTS);
export const fetchSummary = () => safeGetSingle<TimelineSummary>('/timeline/summary', DEMO_SUMMARY);
export const fetchStats = () => safeGetSingle<TimelineStats>('/timeline/stats', DEMO_STATS);
