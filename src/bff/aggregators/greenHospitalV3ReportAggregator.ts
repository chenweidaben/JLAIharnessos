/**
 * 健澜科技 jlmedaios - 绿色医院碳中和 V3 纯函数（M246-A）
 *
 * buildGreenHospitalV3Report / calculateCarbonFootprintV3 / assessGreenBuildingV3
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算碳足迹 V3（纯函数）。
 *
 * @param energy 能源(tCO2e)
 * @param waste 废弃物(tCO2e)
 * @param transport 交通(tCO2e)
 * @returns 碳足迹
 */
export function calculateCarbonFootprintV3(energy: number, waste: number, transport: number): { total: number; target: number; reduction: number } {
  const total = Math.round((energy + waste + transport) * 10) / 10;
  const target = Math.round(total * 0.8 * 10) / 10;
  const reduction = Math.round((1 - target / total) * 100);
  return { total, target, reduction };
}

/**
 * 评估绿色建筑 V3（纯函数）。
 *
 * @param building 建筑
 * @returns 评级
 */
export function assessGreenBuildingV3(building: { leed: number; energy: number; water: number }): { level: string; score: number } {
  const score = Math.round((building.leed + building.energy + building.water) / 3);
  let level = "二星";
  if (score >= 90) level = "三星";
  else if (score < 70) level = "一星";
  return { level, score };
}

/** 绿色医院 V3 报告输出 */
export interface GreenHospitalV3Report {
  timeRange: string;
  carbon: { energy: number; waste: number; transport: number };
  building: { leed: number; hvac: number; lighting: number };
  waste: { medical: number; recycling: number; reclaimedWater: number };
  suggestions: string[];
}

/**
 * 构建绿色医院 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 绿色医院 V3 报告
 */
export function buildGreenHospitalV3Report(timeRange: string): GreenHospitalV3Report {
  return {
    timeRange,
    carbon: { energy: 5000, waste: 500, transport: 200 },
    building: { leed: 85, hvac: 80, lighting: 90 },
    waste: { medical: 100, recycling: 200, reclaimedWater: 5000 },
    suggestions: ["提升可再生能源比例", "加强医废资源化"],
  };
}
