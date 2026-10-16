/**
 * 健澜科技 jlmedaios - 党建与行政管理纯函数（M212-A）
 *
 * buildPartyAdminReport / assessPartyBuildingActivity / trackComplianceRisk
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估党建活动（纯函数）。
 *
 * @param meetings 三会一课次数
 * @param members 党员数
 * @returns 活动密度
 */
export function assessPartyBuildingActivity(meetings: number, members: number): { density: number; level: string } {
  const density = members > 0 ? meetings / members : 0;
  let level = '达标';
  if (density >= 0.5) level = '活跃';
  else if (density < 0.1) level = '不足';
  return { density, level };
}

/** 科室合规风险 */
export interface ComplianceRisk {
  dept: string;
  riskLevel: number;
}

/**
 * 追踪合规风险（纯函数）。
 *
 * @param depts 科室列表
 * @returns 高风险科室
 */
export function trackComplianceRisk(depts: ComplianceRisk[]): { highRisk: string[]; total: number } {
  const highRisk = depts.filter((d) => d.riskLevel >= 3).map((d) => d.dept);
  return { highRisk, total: depts.length };
}

/** 党建行政报告输出 */
export interface PartyAdminReport {
  timeRange: string;
  party: { threeMeetings: number; themeDay: number; members: number };
  integrity: { cases: number };
  publicity: { articles: number };
  unitedFront: { activities: number };
  office: { documents: number };
  petition: { cases: number };
  legal: { contracts: number };
  system: { documents: number };
  suggestions: string[];
}

/**
 * 构建党建行政报告。
 *
 * @param timeRange 时间范围
 * @returns 党建行政报告
 */
export function buildPartyAdminReport(timeRange: string): PartyAdminReport {
  return {
    timeRange,
    party: { threeMeetings: 20, themeDay: 12, members: 300 },
    integrity: { cases: 2 },
    publicity: { articles: 50 },
    unitedFront: { activities: 5 },
    office: { documents: 200 },
    petition: { cases: 10 },
    legal: { contracts: 100 },
    system: { documents: 30 },
    suggestions: ['提高三会一课频次', '加强合规风险排查'],
  };
}
