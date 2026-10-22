/**
 * 健澜科技 jlmedaios - 车辆管理 API（M751）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type VehicleStatus = 'available' | 'in_use' | 'maintenance';

export interface Vehicle {
  id: string;
  plate: string;
  type: string;
  driver: string;
  dept: string;
  status: VehicleStatus;
  usages: { date: string; purpose: string; miles: number }[];
  maintenances: { date: string; item: string; cost: number }[];
}

export const VEHICLE_STATUS_META: Record<VehicleStatus, { label: string; color: string }> = {
  available: { label: '空闲', color: 'green' },
  in_use: { label: '使用中', color: 'blue' },
  maintenance: { label: '维修中', color: 'orange' },
};

const DEMO: Vehicle[] = [
  {
    id: 'VH-001',
    plate: '浙A·12000',
    type: '救护车',
    driver: '王师傅',
    dept: '急诊科',
    status: 'available',
    usages: [
      { date: '2026-10-20', purpose: '120 急救出诊', miles: 60 },
    ],
    maintenances: [
      { date: '2026-09-15', item: '常规保养', cost: 800 },
    ],
  },
];

export interface VehicleListResult {
  items: Vehicle[];
  demo: boolean;
}

export async function fetchVehicles(): Promise<VehicleListResult> {
  try {
    const res = await get<{ items: Vehicle[] }>('/admin/vehicles');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
