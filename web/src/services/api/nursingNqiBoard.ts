/**
 * 健澜科技 jlmedaios - 护理 NQI 敏感质量指标看板 API（M510）
 * 对接 BFF /api/v1/nursing/nqi/* ：
 *   /nursing/nqi/incidents   不良事件
 *   /nursing/nqi/prevention 预防措施
 *   /nursing/nqi/stats       NQI 统计
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface IncidentRow {
  id: string;
  type: 'fall' | 'pressureUlcer' | 'tubeDisplacement' | 'restraint' | 'painUnassessed';
  dept: string;
  severity: 'light' | 'medium' | 'heavy';
  demo?: boolean;
}

export interface PreventionRow {
  id: string;
  measure: 'turning' | 'bedRails' | 'identification' | 'restraintAssess' | 'painReassess';
  rate: number; // %
  demo?: boolean;
}

export interface NqiStats {
  monthlyIncidents: number;
  incidentRate: number; // %
  preventionRate: number; // %
  painAssessmentCoverage: number; // %
  demo?: boolean;
}

const DEMO_INCIDENTS: IncidentRow[] = [
  { id: 'i-1', type: 'fall', dept: '老年病房', severity: 'medium', demo: true },
  { id: 'i-2', type: 'pressureUlcer', dept: 'ICU', severity: 'heavy', demo: true },
  { id: 'i-3', type: 'tubeDisplacement', dept: '普外科', severity: 'medium', demo: true },
  { id: 'i-4', type: 'restraint', dept: '神经内科', severity: 'light', demo: true },
  { id: 'i-5', type: 'painUnassessed', dept: '肿瘤科', severity: 'light', demo: true },
];

const DEMO_PREVENTION: PreventionRow[] = [
  { id: 'pv-1', measure: 'turning', rate: 96.5, demo: true },
  { id: 'pv-2', measure: 'bedRails', rate: 99.0, demo: true },
  { id: 'pv-3', measure: 'identification', rate: 92.0, demo: true },
  { id: 'pv-4', measure: 'restraintAssess', rate: 80.5, demo: true },
  { id: 'pv-5', measure: 'painReassess', rate: 94.0, demo: true },
];

const DEMO_STATS: NqiStats = {
  monthlyIncidents: 18,
  incidentRate: 0.42,
  preventionRate: 91.5,
  painAssessmentCoverage: 88.0,
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

export const fetchIncidents = () => safeGet<IncidentRow>('/nursing/nqi/incidents', DEMO_INCIDENTS);
export const fetchPrevention = () => safeGet<PreventionRow>('/nursing/nqi/prevention', DEMO_PREVENTION);
export const fetchStats = () => safeGetSingle<NqiStats>('/nursing/nqi/stats', DEMO_STATS);
