/**
 * 健澜科技 jlmedaios - 后勤设备 V4 纯函数（M254-D）
 *
 * buildLogisticsEquipmentV4Report / assessEquipmentUtilizationV4 / calculateCarbonEmissionV4
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估设备利用率 V4（纯函数）。
 *
 * @param equipments 设备
 * @returns 利用率
 */
export function assessEquipmentUtilizationV4(equipments: { uptime: number; utilization: number; failure: number }): { uptime: number; utilization: number; failure: number; adequate: boolean } {
  const adequate = equipments.uptime >= 95 && equipments.failure <= 5;
  return { ...equipments, adequate };
}

/**
 * 计算碳排放 V4（纯函数）。
 *
 * @param energy 能源
 * @param waste 废弃物
 * @returns 碳排放
 */
export function calculateCarbonEmissionV4(energy: { kwh: number; gas: number }, waste: { ton: number }): { carbon: number; offset: number; net: number } {
  const carbon = Math.round((energy.kwh * 0.5 + energy.gas * 2 + waste.ton * 100) / 1000);
  const offset = Math.round(carbon * 0.1);
  return { carbon, offset, net: carbon - offset };
}

/** 后勤设备 V4 报告输出 */
export interface LogisticsEquipmentV4Report {
  timeRange: string;
  lifecycle: { plan: number; purchase: number; accept: number; use: number; maintenance: number; metrology: number; scrap: number; update: number };
  equipment: { diagnostic: number; therapeutic: number; monitor: number; emergency: number; surgery: number; imaging: number };
  benefit: { uptime: number; utilization: number; failure: number; yield: number; positiveRate: number; payback: number };
  metrology: { forced: number; periodic: number; calibration: number; tag: number; nonconforming: number };
  spd: { highValue: number; lowValue: number; implant: number; reagent: number; dressing: number; smartCabinet: number; udi: number };
  logistics: { utility: number; water: number; power: number; laundry: number; catering: number; vehicle: number; safety: number; infra: number; carbon: number };
  safety: { electrical: number; radiation: number; biosafety: number; alarm: number; preventive: number };
  management: { workOrder: number; inspection: number; energyMonitor: number; smartRepair: number; dashboard: number; greenHospital: number };
  suggestions: string[];
}

/**
 * 构建后勤设备 V4 报告。
 *
 * @param timeRange 时间范围
 * @returns 后勤设备 V4 报告
 */
export function buildLogisticsEquipmentV4Report(timeRange: string): LogisticsEquipmentV4Report {
  return {
    timeRange,
    lifecycle: { plan: 50, purchase: 30, accept: 30, use: 500, maintenance: 100, metrology: 200, scrap: 10, update: 20 },
    equipment: { diagnostic: 200, therapeutic: 150, monitor: 300, emergency: 100, surgery: 80, imaging: 50 },
    benefit: { uptime: 97, utilization: 75, failure: 2, yield: 80, positiveRate: 60, payback: 5 },
    metrology: { forced: 100, periodic: 200, calibration: 190, tag: 200, nonconforming: 5 },
    spd: { highValue: 50, lowValue: 200, implant: 30, reagent: 100, dressing: 150, smartCabinet: 20, udi: 100 },
    logistics: { utility: 200, water: 50, power: 100, laundry: 80, catering: 60, vehicle: 30, safety: 100, infra: 50, carbon: 1000 },
    safety: { electrical: 100, radiation: 20, biosafety: 50, alarm: 200, preventive: 150 },
    management: { workOrder: 500, inspection: 1000, energyMonitor: 90, smartRepair: 80, dashboard: 1, greenHospital: 85 },
    suggestions: ["提升设备开机率", "降低碳排放"],
  };
}
