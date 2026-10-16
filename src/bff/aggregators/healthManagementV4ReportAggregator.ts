/**
 * 健澜科技 jlmedaios - 健康管理 V4 纯函数（M253-B）
 *
 * buildHealthManagementV4Report / trackChronicControlV4 / assessHealthRiskV4
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 追踪慢病控制 V4（纯函数）。
 *
 * @param patients 患者
 * @param targets 目标
 * @returns 控制
 */
export function trackChronicControlV4(patients: number[], targets: number): { controlled: number; rate: number; adequate: boolean } {
  const controlled = patients.filter((p) => p <= targets).length;
  const rate = Math.round((controlled / Math.max(patients.length, 1)) * 100);
  return { controlled, rate, adequate: rate >= 60 };
}

/**
 * 评估健康风险 V4（纯函数）。
 *
 * @param questionnaire 问卷
 * @param vitals 生命体征
 * @returns 风险
 */
export function assessHealthRiskV4(questionnaire: { score: number }, vitals: { bmi: number; bp: number }): { risk: number; level: string; suggest: string } {
  let risk = questionnaire.score;
  if (vitals.bmi >= 28) risk += 20;
  if (vitals.bp >= 140) risk += 20;
  let level = "低";
  if (risk >= 60) level = "高";
  else if (risk >= 30) level = "中";
  return { risk, level, suggest: level === "高" ? "建议就医评估" : "定期监测" };
}

/** 健康管理 V4 报告输出 */
export interface HealthManagementV4Report {
  timeRange: string;
  records: { personal: number; family: number; dynamic: number; privacy: number };
  chronic: { htn: number; dm: number; chd: number; stroke: number; controlRate: number };
  checkup: { package: number; booking: number; report: number; positive: number };
  immunization: { vaccine: number; coldChain: number; adverse: number };
  womenChild: { preconception: number; pregnancy: number; twoCancer: number; childCare: number };
  geriatric: { assessment: number; medication: number; nutrition: number; hospice: number };
  education: { lecture: number; handbook: number; newMedia: number; selfMgmt: number };
  center: { checkupCenter: number; chronicClinic: number; vip: number; corporate: number };
  suggestions: string[];
}

/**
 * 构建健康管理 V4 报告。
 *
 * @param timeRange 时间范围
 * @returns 健康管理 V4 报告
 */
export function buildHealthManagementV4Report(timeRange: string): HealthManagementV4Report {
  return {
    timeRange,
    records: { personal: 100000, family: 30000, dynamic: 80, privacy: 100 },
    chronic: { htn: 5000, dm: 2000, chd: 500, stroke: 300, controlRate: 65 },
    checkup: { package: 20000, booking: 18000, report: 19000, positive: 5000 },
    immunization: { vaccine: 10, coldChain: 100, adverse: 5 },
    womenChild: { preconception: 500, pregnancy: 1000, twoCancer: 5000, childCare: 10000 },
    geriatric: { assessment: 2000, medication: 1500, nutrition: 1000, hospice: 50 },
    education: { lecture: 50, handbook: 10000, newMedia: 50000, selfMgmt: 3000 },
    center: { checkupCenter: 20000, chronicClinic: 1000, vip: 500, corporate: 100 },
    suggestions: ["提升慢病控制率", "扩大健康档案覆盖"],
  };
}
