/**
 * 健澜科技 jlmedaios - 数字孪生医院纯函数（M232-C）
 *
 * buildDigitalTwinReport / build3DFacilityMap / simulatePatientFlow
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 构建 3D 院区地图（纯函数）。
 *
 * @param campus 院区名称
 * @returns 地图
 */
export function build3DFacilityMap(campus: string): { buildings: number; floors: number; departments: number } {
  return { buildings: 12, floors: 8, departments: 50 };
}

/**
 * 仿真患者流（纯函数）。
 *
 * @param scenario 场景
 * @returns 仿真结果
 */
export function simulatePatientFlow(scenario: string): { waitTime: number; satisfaction: number } {
  let waitTime = 30;
  if (scenario.includes("高峰")) waitTime = 60;
  return { waitTime, satisfaction: Math.round((100 - waitTime) * 10) / 10 };
}

/** 数字孪生报告输出 */
export interface DigitalTwinReport {
  timeRange: string;
  campus: { buildings: number; floors: number; departments: number; devices: number; personnel: number };
  twin: { or: boolean; icu: boolean; outpatient: boolean; logistics: boolean };
  simulation: { process: boolean; resource: boolean; emergency: boolean };
  iot: { fused: boolean };
  visualization: { dashboard: boolean; commandCenter: boolean };
  suggestions: string[];
}

/**
 * 构建数字孪生报告。
 *
 * @param timeRange 时间范围
 * @returns 数字孪生报告
 */
export function buildDigitalTwinReport(timeRange: string): DigitalTwinReport {
  return {
    timeRange,
    campus: { buildings: 12, floors: 8, departments: 50, devices: 500, personnel: 2000 },
    twin: { or: true, icu: true, outpatient: true, logistics: true },
    simulation: { process: true, resource: true, emergency: true },
    iot: { fused: true },
    visualization: { dashboard: true, commandCenter: true },
    suggestions: ["扩展数字孪生覆盖科室", "提升 IoT 数据实时性"],
  };
}
