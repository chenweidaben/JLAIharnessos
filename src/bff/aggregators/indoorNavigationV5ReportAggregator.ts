/**
 * 健澜科技 jlmedaios - 院内智能导航 V5 纯函数（M270-A）
 *
 * buildIndoorNavigationV5Report / planRouteV5 / analyzeTrafficFlowV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 路径规划 V5（纯函数）。
 *
 * @param from 起点
 * @param to 终点
 * @param constraints 约束
 * @returns 路径
 */
export function planRouteV5(from: { floor: number; area: string }, to: { floor: number; area: string }, constraints: { wheelchair: boolean; elevator: boolean }): { distance: number; time: number; accessible: boolean; route: string[] } {
  let distance = 300;
  if (from.floor !== to.floor) {
    distance += 100;
  }
  let time = Math.round(distance / 60 * 1.5);
  const accessible = constraints.wheelchair && constraints.elevator;
  const route: string[] = [`${from.area}`, "主走廊", `${to.area}`];
  if (from.floor !== to.floor) {
    route.splice(1, 0, "无障碍电梯");
  }
  return { distance, time, accessible, route };
}

/**
 * 人流分析 V5（纯函数）。
 *
 * @param heatmap 热力图
 * @returns 分析
 */
export function analyzeTrafficFlowV5(heatmap: { congestion: number; bottleneck: string; preferredPath: number }): { level: string; peak: number; suggestion: string } {
  let level = "畅通";
  if (heatmap.congestion > 80) {
    level = "严重拥堵";
  } else if (heatmap.congestion > 60) {
    level = "轻度拥堵";
  }
  let suggestion = "无需优化";
  if (level !== "畅通") {
    suggestion = `建议在${heatmap.bottleneck}增派导诊`;
  }
  return { level, peak: heatmap.congestion, suggestion };
}

/** 院内智能导航 V5 报告输出 */
export interface IndoorNavigationV5Report {
  timeRange: string;
  campusMap: { modeling: number; floor: number; dept: number; elevator: number; restroom: number; canteen: number; parking: number; accessibility: number };
  realtimeNav: { ble: number; uwb: number; ar: number; walking: number; indoorLocation: number; destinationRec: number };
  parking: { spaces: number; guidance: number; payment: number; carFinding: number; reservation: number; accessibleEV: number; ev: number };
  visitNav: { entranceToConsult: number; exam: number; pharmacy: number; payment: number; exit: number; multistep: number };
  guide: { voice: number; facilityQuery: number; deptIntro: number; doctorIntro: number; appointmentGuide: number };
  special: { accessible: number; elderlyMode: number; wheelchair: number; visualImpairment: number };
  metrics: { accuracy: number; usageRate: number; findingTime: number; inquiryReduction: number; satisfaction: number };
  ops: { congestionPoint: number; pathPreference: number; bottleneck: number; layoutOptimization: number; flowGuidance: number };
  suggestions: string[];
}

/**
 * 构建院内智能导航 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 院内智能导航 V5 报告
 */
export function buildIndoorNavigationV5Report(timeRange: string): IndoorNavigationV5Report {
  return {
    timeRange,
    campusMap: { modeling: 95, floor: 90, dept: 85, elevator: 80, restroom: 75, canteen: 70, parking: 85, accessibility: 80 },
    realtimeNav: { ble: 90, uwb: 75, ar: 60, walking: 85, indoorLocation: 85, destinationRec: 70 },
    parking: { spaces: 500, guidance: 90, payment: 95, carFinding: 85, reservation: 70, accessibleEV: 20, ev: 50 },
    visitNav: { entranceToConsult: 90, exam: 85, pharmacy: 80, payment: 95, exit: 90, multistep: 85 },
    guide: { voice: 85, facilityQuery: 80, deptIntro: 75, doctorIntro: 70, appointmentGuide: 85 },
    special: { accessible: 80, elderlyMode: 75, wheelchair: 90, visualImpairment: 60 },
    metrics: { accuracy: 90, usageRate: 75, findingTime: 5, inquiryReduction: 40, satisfaction: 88 },
    ops: { congestionPoint: 20, pathPreference: 80, bottleneck: 30, layoutOptimization: 70, flowGuidance: 75 },
    suggestions: ["提升UWB定位覆盖", "优化门诊大厅导流动线"],
  };
}
