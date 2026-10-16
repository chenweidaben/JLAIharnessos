/**
 * 健澜科技 jlmedaios - HRP V3 纯函数（M240-D）
 *
 * buildHRPV3Report / integrateHRPData / analyzeResourceUtilization
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 集成 HRP 数据（纯函数）。
 *
 * @param hr 人力
 * @param finance 财务
 * @param supply 物资
 * @returns 集成
 */
export function integrateHRPData(hr: number, finance: number, supply: number): { total: number; integrated: boolean } {
  return { total: hr + finance + supply, integrated: hr > 0 && finance > 0 && supply > 0 };
}

/**
 * 分析资源利用（纯函数）。
 *
 * @param resources 资源
 * @returns 利用
 */
export function analyzeResourceUtilization(resources: { room: number; equipment: number; staff: number }): { room: number; equipment: number; staff: number } {
  return {
    room: Math.round((resources.room / 1000) * 100),
    equipment: Math.round((resources.equipment / 500) * 100),
    staff: Math.round((resources.staff / 1000) * 100),
  };
}

/** HRP V3 报告输出 */
export interface HRPV3Report {
  timeRange: string;
  hr: { headcount: number };
  finance: { revenue: number; cost: number };
  supply: { spd: number; contract: number };
  project: number;
  integration: { hrpHIS: boolean };
  suggestions: string[];
}

/**
 * 构建 HRP V3 报告。
 *
 * @param timeRange 时间范围
 * @returns HRP V3 报告
 */
export function buildHRPV3Report(timeRange: string): HRPV3Report {
  return {
    timeRange,
    hr: { headcount: 3000 },
    finance: { revenue: 2000000000, cost: 1500000000 },
    supply: { spd: 500000000, contract: 200 },
    project: 50,
    integration: { hrpHIS: true },
    suggestions: ["提升HRP-HIS集成度", "扩大SPD覆盖"],
  };
}
