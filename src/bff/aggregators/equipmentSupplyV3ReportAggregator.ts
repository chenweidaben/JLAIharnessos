/**
 * 健澜科技 jlmedaios - 设备耗材 V3 纯函数（M243-B）
 *
 * buildEquipmentSupplyV3Report / assessEquipmentUtilization / traceUDIV3
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估设备利用率（纯函数）。
 *
 * @param equipments 设备
 * @returns 利用率
 */
export function assessEquipmentUtilization(equipments: { uptime: number; utilization: number; failure: number }): { uptime: number; utilization: number; failure: number; healthy: boolean } {
  return {
    uptime: equipments.uptime,
    utilization: equipments.utilization,
    failure: equipments.failure,
    healthy: equipments.uptime >= 95 && equipments.failure <= 2,
  };
}

/**
 * 追溯 UDI V3（纯函数）。
 *
 * @param udi UDI
 * @returns 追溯
 */
export function traceUDIV3(udi: string): { udi: string; level: number; recalled: boolean } {
  let level = 1;
  let recalled = false;
  if (udi.startsWith("IMPL")) { level = 2; }
  if (udi.includes("RECALL")) { recalled = true; }
  return { udi, level, recalled };
}

/** 设备耗材 V3 报告输出 */
export interface EquipmentSupplyV3Report {
  timeRange: string;
  lifecycle: { planned: number; procured: number; inUse: number; retired: number };
  metrics: { uptime: number; utilization: number; failure: number };
  spd: { high: number; low: number; implant: number };
  metrology: number;
  suggestions: string[];
}

/**
 * 构建设备耗材 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 设备耗材 V3 报告
 */
export function buildEquipmentSupplyV3Report(timeRange: string): EquipmentSupplyV3Report {
  return {
    timeRange,
    lifecycle: { planned: 50, procured: 100, inUse: 2000, retired: 30 },
    metrics: { uptime: 96, utilization: 75, failure: 1.5 },
    spd: { high: 500, low: 10000, implant: 200 },
    metrology: 500,
    suggestions: ["提高设备使用率", "加强计量检定"],
  };
}
