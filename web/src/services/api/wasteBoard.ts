/**
 * 健澜科技 jlmedaios - 医疗废弃物全流程管理看板 API（M500）
 * 对接 BFF /api/v1/waste/* ：
 *   /waste/collection     收集记录
 *   /waste/treatment      处置记录
 *   /waste/traceability   追溯链
 *   /waste/statistics     统计（KPI）
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface CollectionRow {
  id: string;
  dept: string;
  category: 'infectious' | 'sharp' | 'pathological' | 'chemical' | 'pharmaceutical';
  weight: number; // kg
  collectedAt: string;
  demo?: boolean;
}

export interface TreatmentRow {
  id: string;
  method: 'autoclave' | 'incineration' | 'disinfection' | 'chemical';
  weight: number; // kg
  treatedAt: string;
  vendor: string;
  demo?: boolean;
}

export interface TraceabilityRow {
  id: string;
  batchNo: string;
  dept: string;
  collector: string;
  receiver: string;
  status: 'collected' | 'transferred' | 'treated';
  demo?: boolean;
}

export interface WasteStats {
  totalWeight: number; // kg
  infectiousRatio: number; // %
  timelyRate: number; // %
  traceabilityRate: number; // %
  demo?: boolean;
}

const DEMO_COLLECTION: CollectionRow[] = [
  { id: 'co-1', dept: '感染科', category: 'infectious', weight: 42.5, collectedAt: '2026-10-19 09:00', demo: true },
  { id: 'co-2', dept: '外科手术室', category: 'sharp', weight: 8.2, collectedAt: '2026-10-19 10:30', demo: true },
  { id: 'co-3', dept: '病理科', category: 'pathological', weight: 5.6, collectedAt: '2026-10-19 11:00', demo: true },
  { id: 'co-4', dept: '检验科', category: 'chemical', weight: 12.3, collectedAt: '2026-10-19 14:00', demo: true },
  { id: 'co-5', dept: '静脉用药调配中心', category: 'pharmaceutical', weight: 3.8, collectedAt: '2026-10-19 15:00', demo: true },
];

const DEMO_TREATMENT: TreatmentRow[] = [
  { id: 'tr-1', method: 'autoclave', weight: 120.5, treatedAt: '2026-10-18 22:00', vendor: '市医废处置中心', demo: true },
  { id: 'tr-2', method: 'incineration', weight: 35.8, treatedAt: '2026-10-18 23:30', vendor: '省危废处置公司', demo: true },
  { id: 'tr-3', method: 'disinfection', weight: 28.4, treatedAt: '2026-10-19 06:00', vendor: '本院医废站', demo: true },
  { id: 'tr-4', method: 'chemical', weight: 10.2, treatedAt: '2026-10-19 08:00', vendor: '市医废处置中心', demo: true },
];

const DEMO_TRACE: TraceabilityRow[] = [
  { id: 'ta-1', batchNo: 'W20261019-001', dept: '感染科', collector: '保洁-钱**', receiver: '转运-孙**', status: 'treated', demo: true },
  { id: 'ta-2', batchNo: 'W20261019-002', dept: '外科手术室', collector: '保洁-李**', receiver: '转运-周**', status: 'transferred', demo: true },
  { id: 'ta-3', batchNo: 'W20261019-003', dept: '检验科', collector: '保洁-吴**', receiver: '-', status: 'collected', demo: true },
];

const DEMO_STATS: WasteStats = {
  totalWeight: 195.2,
  infectiousRatio: 62.5,
  timelyRate: 98.6,
  traceabilityRate: 100,
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

export const fetchCollection = () => safeGet<CollectionRow>('/waste/collection', DEMO_COLLECTION);
export const fetchTreatment = () => safeGet<TreatmentRow>('/waste/treatment', DEMO_TREATMENT);
export const fetchTraceability = () => safeGet<TraceabilityRow>('/waste/traceability', DEMO_TRACE);
export const fetchStatistics = () => safeGetSingle<WasteStats>('/waste/statistics', DEMO_STATS);
