/**
 * 健澜科技 jlmedaios - 设备管理 API（M895）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface EquipmentWorkload {
  id: string;
  date: string;
  inUse: number;
  broken: number;
  maintenance: number;
  calibration: number;
  scrapped: number;
  status: string;
  categoryBreakdown: { name: string; count: number }[];
  statusBreakdown: { name: string; count: number }[];
  maintenanceRecord: string;
  calibrationRecord: string;
  procurementPlan: string;
  failureRate: string;
}

const DEMO: EquipmentWorkload[] = [
  {
    id: 'EQ-895',
    date: '2026-10-22',
    inUse: 680,
    broken: 6,
    maintenance: 24,
    calibration: 18,
    scrapped: 2,
    status: '正常运行',
    categoryBreakdown: [
      { name: '大型设备（CT/MR/DSA）', count: 12 },
      { name: '中型设备（超声/麻醉机）', count: 168 },
      { name: '小型设备（监护仪/输液泵）', count: 500 },
    ],
    statusBreakdown: [
      { name: '在用', count: 680 },
      { name: '闲置', count: 18 },
      { name: '维修中', count: 6 },
      { name: '待报废', count: 4 },
    ],
    maintenanceRecord: '维护保养记录：本月预防性维护 24 台次；故障维修 6 台次（CT 球管 1/监护仪 3/输液泵 2）。',
    calibrationRecord: '计量检定记录：本月强检 18 台（CT/MR/DSA/血压计/天平）；全部合格；漏检 0 台。',
    procurementPlan: '设备采购计划：本年度预算 3200 万；在采 8 台（直线加速器 1/DSA 1/彩超 4/麻醉机 2）。',
    failureRate: '故障率统计：本月设备故障率 0.88%（目标 ≤1.5%）；大型设备开机率 95%。',
  },
];

export interface EquipmentWorkloadListResult {
  items: EquipmentWorkload[];
  demo: boolean;
}

export async function fetchEquipmentWorkload(): Promise<EquipmentWorkloadListResult> {
  try {
    const res = await get<{ items: EquipmentWorkload[] }>('/equipment/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
