/**
 * 健澜科技 jlmedaios - 消毒供应中心 CSSD 看板 API（M487）
 * 对接 BFF /api/v1/cssd/* ：
 *   /cssd/workload  工作量
 *   /cssd/quality   质量监测
 *   /cssd/stock     无菌包库存
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface WorkloadRow {
  id: string;
  dept: string;
  cleaned: number;
  packed: number;
  sterilized: number;
  demo?: boolean;
}

export interface QualityRow {
  id: string;
  item: string; // 包装合格率/生物监测/化学监测/B-D 试验/湿包率
  passRate: number; // %
  demo?: boolean;
}

export interface StockRow {
  id: string;
  name: string;
  stock: number;
  safetyStock: number;
  expiry: string;
  demo?: boolean;
}

const DEMO_WORKLOAD: WorkloadRow[] = [
  { id: 'w-1', dept: '普外科器械包', cleaned: 420, packed: 410, sterilized: 405, demo: true },
  { id: 'w-2', dept: '骨科器械包', cleaned: 180, packed: 175, sterilized: 172, demo: true },
  { id: 'w-3', dept: '妇产科器械包', cleaned: 220, packed: 215, sterilized: 210, demo: true },
  { id: 'w-4', dept: '口腔科器械包', cleaned: 96, packed: 94, sterilized: 92, demo: true },
  { id: 'w-5', dept: '腔镜器械包', cleaned: 60, packed: 58, sterilized: 56, demo: true },
];

const DEMO_QUALITY: QualityRow[] = [
  { id: 'q-1', item: '包装合格率', passRate: 99.2, demo: true },
  { id: 'q-2', item: '生物监测合格率', passRate: 100.0, demo: true },
  { id: 'q-3', item: '化学监测合格率', passRate: 98.5, demo: true },
  { id: 'q-4', item: 'B-D 试验合格率', passRate: 100.0, demo: true },
  { id: 'q-5', item: '湿包率', passRate: 96.8, demo: true },
];

const DEMO_STOCK: StockRow[] = [
  { id: 's-1', name: '普外科基础器械包', stock: 120, safetyStock: 80, expiry: '2026-12-31', demo: true },
  { id: 's-2', name: '骨科脊柱专用包', stock: 24, safetyStock: 30, expiry: '2026-11-15', demo: true },
  { id: 's-3', name: '妇产科分娩包', stock: 60, safetyStock: 40, expiry: '2027-03-31', demo: true },
  { id: 's-4', name: '腔镜镜头专用包', stock: 12, safetyStock: 10, expiry: '2027-01-20', demo: true },
  { id: 's-5', name: '换药包', stock: 480, safetyStock: 200, expiry: '2026-10-25', demo: true },
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

export const fetchWorkload = () => safeGet<WorkloadRow>('/cssd/workload', DEMO_WORKLOAD);
export const fetchQuality = () => safeGet<QualityRow>('/cssd/quality', DEMO_QUALITY);
export const fetchStock = () => safeGet<StockRow>('/cssd/stock', DEMO_STOCK);
