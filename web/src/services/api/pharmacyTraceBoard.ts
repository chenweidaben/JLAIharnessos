/**
 * 健澜科技 jlmedaios - 药品追溯深度监控看板 API（M518）
 * 对接 BFF /api/v1/pharmacy/* ：
 *   /pharmacy/trace       药品追溯
 *   /pharmacy/cold-chain  冷链监控
 *   /pharmacy/expiry      近效期预警
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface TraceRow {
  id: string;
  name: string;
  batch: string;
  traceCode: string;
  manufacturer: string;
  distributor: string;
  dept: string;
  tempStatus: 'normal' | 'abnormal';
  demo?: boolean;
}

export interface ColdChainRow {
  id: string;
  name: string;
  tempBand: 'ok' | 'low' | 'high';
  recordedAt: string;
  alarm: boolean;
  demo?: boolean;
}

export interface ExpiryRow {
  id: string;
  name: string;
  batch: string;
  monthsLeft: number;
  stockQty: number;
  dept: string;
  demo?: boolean;
}

const DEMO_TRACE: TraceRow[] = [
  { id: 'tr-1', name: '注射用头孢曲松钠', batch: 'B20260801', traceCode: '81234567890123456789', manufacturer: '华北制药', distributor: '国药控股', dept: '住院药房', tempStatus: 'normal', demo: true },
  { id: 'tr-2', name: '重组人胰岛素注射液', batch: 'B20260915', traceCode: '81234567890987654321', manufacturer: '甘李药业', distributor: '华润医药', dept: '门诊药房', tempStatus: 'abnormal', demo: true },
  { id: 'tr-3', name: '人血白蛋白', batch: 'B20260720', traceCode: '81234567890555555555', manufacturer: '上海生物所', distributor: '上药控股', dept: '急诊科', tempStatus: 'normal', demo: true },
];

const DEMO_COLD: ColdChainRow[] = [
  { id: 'cc-1', name: '重组人胰岛素注射液', tempBand: 'ok', recordedAt: '2026-10-20 08:30', alarm: false, demo: true },
  { id: 'cc-2', name: '乙肝疫苗', tempBand: 'high', recordedAt: '2026-10-20 09:15', alarm: true, demo: true },
  { id: 'cc-3', name: '静注人免疫球蛋白', tempBand: 'ok', recordedAt: '2026-10-20 10:00', alarm: false, demo: true },
];

const DEMO_EXPIRY: ExpiryRow[] = [
  { id: 'ex-1', name: '维生素 C 注射液', batch: 'B20251101', monthsLeft: 2.5, stockQty: 1200, dept: '住院药房', demo: true },
  { id: 'ex-2', name: '葡萄糖酸钙注射液', batch: 'B20250910', monthsLeft: 0.8, stockQty: 320, dept: '门诊药房', demo: true },
  { id: 'ex-3', name: '0.9% 氯化钠注射液', batch: 'B20260101', monthsLeft: 5.2, stockQty: 8000, dept: '中心库房', demo: true },
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

export const fetchTrace = () => safeGet<TraceRow>('/pharmacy/trace', DEMO_TRACE);
export const fetchColdChain = () => safeGet<ColdChainRow>('/pharmacy/cold-chain', DEMO_COLD);
export const fetchExpiry = () => safeGet<ExpiryRow>('/pharmacy/expiry', DEMO_EXPIRY);
