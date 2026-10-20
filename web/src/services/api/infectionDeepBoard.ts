/**
 * 健澜科技 jlmedaios - 院感监控深度看板 API（M514）
 * 对接 BFF /api/v1/infection/* ：
 *   /infection/deep-rates     院感发生率
 *   /infection/hand-hygiene   手卫生依从
 *   /infection/stats          院感统计
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface DeepRateRow {
  id: string;
  type: 'VAP' | 'CLABSI' | 'CAUTI' | 'SSI' | 'MDRO';
  dept: string;
  ratePerMillion: number; // ‰
  demo?: boolean;
}

export interface HandHygieneRow {
  id: string;
  dept: string;
  observations: number;
  complianceRate: number; // %
  sanitizerUsed: number; // mL
  demo?: boolean;
}

export interface InfectionStats {
  monthlyCases: number;
  infectionRate: number; // %
  mdroRate: number; // %
  handHygieneRate: number; // %
  demo?: boolean;
}

const DEMO_RATES: DeepRateRow[] = [
  { id: 'dr-1', type: 'VAP', dept: 'ICU', ratePerMillion: 3.2, demo: true },
  { id: 'dr-2', type: 'CLABSI', dept: 'ICU', ratePerMillion: 1.8, demo: true },
  { id: 'dr-3', type: 'CAUTI', dept: '普外科', ratePerMillion: 0.6, demo: true },
  { id: 'dr-4', type: 'SSI', dept: '骨科', ratePerMillion: 4.5, demo: true },
  { id: 'dr-5', type: 'MDRO', dept: '呼吸内科', ratePerMillion: 6.8, demo: true },
];

const DEMO_HAND: HandHygieneRow[] = [
  { id: 'hh-1', dept: 'ICU', observations: 320, complianceRate: 96.5, sanitizerUsed: 18_600, demo: true },
  { id: 'hh-2', dept: '普外科', observations: 240, complianceRate: 88.2, sanitizerUsed: 12_400, demo: true },
  { id: 'hh-3', dept: '门诊', observations: 180, complianceRate: 78.5, sanitizerUsed: 8_200, demo: true },
];

const DEMO_STATS: InfectionStats = {
  monthlyCases: 42,
  infectionRate: 1.86,
  mdroRate: 2.45,
  handHygieneRate: 91.5,
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

export const fetchDeepRates = () => safeGet<DeepRateRow>('/infection/deep-rates', DEMO_RATES);
export const fetchHandHygiene = () => safeGet<HandHygieneRow>('/infection/hand-hygiene', DEMO_HAND);
export const fetchStats = () => safeGetSingle<InfectionStats>('/infection/stats', DEMO_STATS);
