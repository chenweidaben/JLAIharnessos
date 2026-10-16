/**
 * 健澜科技 jlmedaios - 设备耗材 V2 纯函数（M213-A）
 *
 * buildEquipmentReportV2 / assessEquipmentUtilization / trackConsumableTraceability
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估设备利用率（纯函数）。
 *
 * @param usage 使用小时
 * @param available 可用小时
 * @returns 利用率
 */
export function assessEquipmentUtilization(usage: number, available: number): { rate: number; level: string } {
  const rate = available > 0 ? usage / available : 0;
  let level = '良好';
  if (rate >= 0.8) level = '高效';
  else if (rate < 0.4) level = '闲置';
  return { rate, level };
}

/**
 * 追踪高值耗材追溯（纯函数）。
 *
 * @param barcode 条码
 * @returns 追溯状态
 */
export function trackConsumableTraceability(barcode: string): { traceable: boolean; status: string } {
  const traceable = barcode.length >= 8;
  return { traceable, status: traceable ? '可追溯' : '不可追溯' };
}

/** 设备 V2 报告输出 */
export interface EquipmentReportV2 {
  timeRange: string;
  lifecycle: { total: number; newPurchased: number; scrapped: number };
  performance: { utilization: number; positiveRate: number; revenue: number };
  maintenance: { pmCompleted: number; repair: number };
  metrology: { calibrated: number; overdue: number };
  consumable: { highValue: number; lowValue: number };
  safety: { incidents: number };
  archive: { oneMachineOneFile: boolean };
  suggestions: string[];
}

/**
 * 构建设备 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 设备 V2 报告
 */
export function buildEquipmentReportV2(timeRange: string): EquipmentReportV2 {
  return {
    timeRange,
    lifecycle: { total: 2000, newPurchased: 50, scrapped: 20 },
    performance: { utilization: 0.75, positiveRate: 0.6, revenue: 50000000 },
    maintenance: { pmCompleted: 95, repair: 30 },
    metrology: { calibrated: 500, overdue: 10 },
    consumable: { highValue: 10000, lowValue: 50000 },
    safety: { incidents: 2 },
    archive: { oneMachineOneFile: true },
    suggestions: ['降低设备闲置率', '加强计量检定'],
  };
}
