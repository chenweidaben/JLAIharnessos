/**
 * 健澜科技 jlmedaios - 设备管理看板 API（M486）
 * 对接 BFF /api/v1/equipment/* ：
 *   /equipment/lifecycle  设备生命周期
 *   /equipment/maintenance 维修
 *   /equipment/utilization 使用率
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface LifecycleRow {
  id: string;
  name: string;
  model: string;
  status: 'in-use' | 'standby' | 'repair' | 'retired';
  purchasedAt: string;
  value: number;
  demo?: boolean;
}

export interface MaintenanceRow {
  id: string;
  device: string;
  fault: string;
  status: 'pending' | 'processing' | 'done' | 'warranty';
  cost: number;
  demo?: boolean;
}

export interface UtilizationRow {
  id: string;
  device: string;
  hoursInUse: number;
  rate: number; // %
  demo?: boolean;
}

const DEMO_LIFECYCLE: LifecycleRow[] = [
  { id: 'l-1', name: '1.5T 核磁共振', model: 'Siemens Magnetom', status: 'in-use', purchasedAt: '2022-05-10', value: 12000000, demo: true },
  { id: 'l-2', name: '64 排 CT', model: 'GE Revolution', status: 'in-use', purchasedAt: '2021-09-15', value: 8500000, demo: true },
  { id: 'l-3', name: '数字化 DR', model: 'Mindray DigiEye', status: 'repair', purchasedAt: '2020-03-20', value: 1200000, demo: true },
  { id: 'l-4', name: '全自动生化分析仪', model: 'Roche Cobas 8000', status: 'in-use', purchasedAt: '2023-01-08', value: 680000, demo: true },
  { id: 'l-5', name: '高频电刀', model: 'Olympus UES-40', status: 'standby', purchasedAt: '2019-11-30', value: 85000, demo: true },
];

const DEMO_MAINTENANCE: MaintenanceRow[] = [
  { id: 'm-1', device: '数字化 DR', fault: '球管老化', status: 'processing', cost: 42000, demo: true },
  { id: 'm-2', device: '1.5T 核磁共振', fault: '冷头异响', status: 'warranty', cost: 0, demo: true },
  { id: 'm-3', device: '高频电刀', fault: '输出功率不稳', status: 'done', cost: 3200, demo: true },
  { id: 'm-4', device: '超声诊断仪', fault: '探头损坏', status: 'pending', cost: 18000, demo: true },
];

const DEMO_UTIL: UtilizationRow[] = [
  { id: 'u-1', device: '1.5T 核磁共振', hoursInUse: 168, rate: 88.4, demo: true },
  { id: 'u-2', device: '64 排 CT', hoursInUse: 156, rate: 82.1, demo: true },
  { id: 'u-3', device: '数字化 DR', hoursInUse: 96, rate: 50.5, demo: true },
  { id: 'u-4', device: '全自动生化分析仪', hoursInUse: 180, rate: 94.7, demo: true },
  { id: 'u-5', device: '超声诊断仪', hoursInUse: 120, rate: 63.2, demo: true },
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

export const fetchLifecycle = () =>
  safeGet<LifecycleRow>('/equipment/lifecycle', DEMO_LIFECYCLE);
export const fetchMaintenance = () =>
  safeGet<MaintenanceRow>('/equipment/maintenance', DEMO_MAINTENANCE);
export const fetchUtilization = () =>
  safeGet<UtilizationRow>('/equipment/utilization', DEMO_UTIL);
