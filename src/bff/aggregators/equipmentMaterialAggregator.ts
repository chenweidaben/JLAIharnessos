/**
 * 健澜科技 jlmedaios - 设备物资管理纯函数（M191-D）
 *
 * buildEquipmentMaterialReport / calculateEquipmentROI
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 设备数据 */
export interface EquipmentData {
  initialCost: number;
  annualRevenue: number;
  annualMaintenanceCost: number;
  expectedLifeYears: number;
}

/**
 * 设备投资回报率（纯函数）。
 *
 * @param data 设备数据
 * @returns ROI 百分比 + 回收期（年）
 */
export function calculateEquipmentROI(data: EquipmentData): { roi: number; paybackYears: number } {
  const annualNet = data.annualRevenue - data.annualMaintenanceCost;
  const roi = Math.round((annualNet / data.initialCost) * 1000) / 10;
  const paybackYears = annualNet > 0 ? Math.round((data.initialCost / annualNet) * 10) / 10 : 99;
  return { roi, paybackYears };
}

/** 设备物资报告输出 */
export interface EquipmentMaterialReport {
  dept: string;
  timeRange: string;
  ledger: { large: number; medium: number; small: number; totalValue: number };
  utilization: { uptimeRate: number; usageRate: number; failureRate: number };
  maintenance: { totalCost: number; mttr: number };
  consumables: { highValueStock: number; lowValueStock: number; monthlyConsumption: number };
  depreciation: { annualDepreciation: number };
  rois: { equipment: string; roi: number; paybackYears: number }[];
  alerts: string[];
}

/**
 * 构建设备物资管理报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 设备物资报告
 */
export function buildEquipmentMaterialReport(dept: string, timeRange: string): EquipmentMaterialReport {
  const ct = calculateEquipmentROI({ initialCost: 5000000, annualRevenue: 2000000, annualMaintenanceCost: 200000, expectedLifeYears: 8 });
  const mr = calculateEquipmentROI({ initialCost: 2000000, annualRevenue: 800000, annualMaintenanceCost: 100000, expectedLifeYears: 6 });

  return {
    dept,
    timeRange,
    ledger: { large: 25, medium: 120, small: 500, totalValue: 85000000 },
    utilization: { uptimeRate: 0.92, usageRate: 0.75, failureRate: 0.03 },
    maintenance: { totalCost: 1500000, mttr: 4.5 },
    consumables: { highValueStock: 1200000, lowValueStock: 300000, monthlyConsumption: 800000 },
    depreciation: { annualDepreciation: 8500000 },
    rois: [
      { equipment: 'CT', roi: ct.roi, paybackYears: ct.paybackYears },
      { equipment: 'MR', roi: mr.roi, paybackYears: mr.paybackYears },
    ],
    alerts: ['高值耗材库存低于安全线，建议补货', 'CT 设备故障率偏高，建议预防性维护'],
  };
}
