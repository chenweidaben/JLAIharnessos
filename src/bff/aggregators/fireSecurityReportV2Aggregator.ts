/**
 * 健澜科技 jlmedaios - 消防安保 V2 纯函数（M229-B）
 *
 * buildFireSecurityReportV2 / assessFireSafety / handleViolenceIncident
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估消防安全（纯函数）。
 *
 * @param facilities 消防设施达标数
 * @param hazards 隐患数
 * @returns 安全等级
 */
export function assessFireSafety(facilities: number, hazards: number): { score: number; level: string } {
  const score = Math.max(0, Math.min(100, facilities - hazards * 5));
  let level = '一般';
  if (score >= 90) level = '优秀';
  else if (score >= 75) level = '良好';
  return { score, level };
}

/**
 * 处置暴力伤医事件（纯函数）。
 *
 * @param incident 事件描述
 * @returns 处置结果
 */
export function handleViolenceIncident(incident: string): { response: string; reported: boolean } {
  let response = '常规处置';
  let reported = false;
  if (incident.includes('持刀') || incident.includes('伤人')) {
    response = '紧急响应·报警';
    reported = true;
  }
  return { response, reported };
}

/** 消防安保 V2 报告输出 */
export interface FireSecurityReportV2 {
  timeRange: string;
  fire: { facilities: number; exits: number; drills: number };
  security: { patrols: number; cameras: number; visitors: number };
  antiTerror: { drills: number };
  keyAreas: { protected: number };
  access: { doors: number };
  cctv: { coverage: number };
  traffic: { gates: number };
  team: { guards: number };
  suggestions: string[];
}

/**
 * 构建消防安保 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 消防安保 V2 报告
 */
export function buildFireSecurityReportV2(timeRange: string): FireSecurityReportV2 {
  return {
    timeRange,
    fire: { facilities: 500, exits: 100, drills: 4 },
    security: { patrols: 365, cameras: 800, visitors: 50000 },
    antiTerror: { drills: 2 },
    keyAreas: { protected: 20 },
    access: { doors: 200 },
    cctv: { coverage: 98 },
    traffic: { gates: 4 },
    team: { guards: 50 },
    suggestions: ['加强消防设施巡检', '提升反恐防暴能力'],
  };
}
