/**
 * 健澜科技 jlmedaios - 安全保卫 V3 纯函数（M243-C）
 *
 * buildSecurityV3Report / assessFireSafetyV3 / handleViolenceV3
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估消防安全 V3（纯函数）。
 *
 * @param facilities 设施
 * @param hazards 隐患
 * @returns 消防
 */
export function assessFireSafetyV3(facilities: { smokeDetector: number; extinguisher: number; exit: number }, hazards: { found: number; rectified: number }): { facilities: number; rectificationRate: number; excellent: boolean } {
  const rectificationRate = Math.round((hazards.rectified / hazards.found) * 100);
  return {
    facilities: facilities.smokeDetector + facilities.extinguisher + facilities.exit,
    rectificationRate,
    excellent: rectificationRate >= 98,
  };
}

/**
 * 处置暴力伤医 V3（纯函数）。
 *
 * @param incident 事件
 * @returns 处置
 */
export function handleViolenceV3(incident: { type: string; responseTime: number }): { type: string; responseTime: number; level: string } {
  let level = "一般";
  if (incident.type === "持刀") level = "I级";
  else if (incident.responseTime <= 3) level = "快速";
  return { type: incident.type, responseTime: incident.responseTime, level };
}

/** 安全保卫 V3 报告输出 */
export interface SecurityV3Report {
  timeRange: string;
  fire: { detector: number; extinguisher: number; exit: number; drill: number };
  guard: { patrol: number; visitor: number; keyArea: number };
  antiTerrorism: number;
  cctv: number;
  suggestions: string[];
}

/**
 * 构建安全保卫 V3 报告。
 *
 * @param timeRange 时间范围
 * @returns 安全保卫 V3 报告
 */
export function buildSecurityV3Report(timeRange: string): SecurityV3Report {
  return {
    timeRange,
    fire: { detector: 2000, extinguisher: 500, exit: 100, drill: 12 },
    guard: { patrol: 365, visitor: 100000, keyArea: 20 },
    antiTerrorism: 5,
    cctv: 500,
    suggestions: ["加强反恐演练", "提高监控覆盖率"],
  };
}
