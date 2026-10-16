/**
 * 健澜科技 jlmedaios - 妇幼肿瘤专科深化纯函数（M201-C）
 *
 * buildSpecialtyReport / classifyPregnancyRisk / assessTumorStage
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 妊娠数据 */
export interface PregnancyData {
  age: number;
  gestationalWeeks: number;
  bloodPressure: number;
  glucose: number;
  previousComplications: boolean;
}

/**
 * 妊娠风险分级（纯函数）。
 *
 * @param pregnancy 妊娠数据
 * @returns 风险等级
 */
export function classifyPregnancyRisk(pregnancy: PregnancyData): { level: string; score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  if (pregnancy.age >= 35) { score += 2; factors.push('高龄产妇'); }
  if (pregnancy.bloodPressure >= 140) { score += 3; factors.push('高血压'); }
  if (pregnancy.glucose >= 7.0) { score += 3; factors.push('妊娠期糖尿病'); }
  if (pregnancy.previousComplications) { score += 2; factors.push('既往并发症'); }

  let level = '低风险';
  if (score >= 8) level = '高风险';
  else if (score >= 4) level = '中风险';

  return { level, score, factors };
}

/** 肿瘤数据 */
export interface TumorData {
  sizeMm: number;
  lymphNodeInvolved: boolean;
  distantMetastasis: boolean;
}

/**
 * 肿瘤分期（纯函数）。
 *
 * @param tumor 肿瘤数据
 * @returns 分期
 */
export function assessTumorStage(tumor: TumorData): { stage: string; tnm: string } {
  let t = 'T1';
  if (tumor.sizeMm > 50) t = 'T3';
  else if (tumor.sizeMm > 20) t = 'T2';

  const n = tumor.lymphNodeInvolved ? 'N1' : 'N0';
  const m = tumor.distantMetastasis ? 'M1' : 'M0';

  let stage = 'I期';
  if (m === 'M1') stage = 'IV期';
  else if (n === 'N1') stage = 'III期';
  else if (t === 'T2' || t === 'T3') stage = 'II期';

  return { stage, tnm: `${t}${n}${m}` };
}

/** 专科报告输出 */
export interface SpecialtyReport {
  dept: string;
  timeRange: string;
  maternalHealth: { prenatalChecks: number; highRiskPregnancies: number };
  delivery: { deliveries: number; cesareanRate: number };
  gynecology: { visits: number; surgeries: number };
  pediatrics: { visits: number; vaccinations: number };
  oncology: { screening: number; diagnosed: number; chemo: number; radiotherapy: number; followup: number };
  quality: { avgStayDays: number; readmissionRate: number };
  suggestions: string[];
}

/**
 * 构建专科报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 专科报告
 */
export function buildSpecialtyReport(dept: string, timeRange: string): SpecialtyReport {
  return {
    dept,
    timeRange,
    maternalHealth: { prenatalChecks: 2000, highRiskPregnancies: 150 },
    delivery: { deliveries: 800, cesareanRate: 0.35 },
    gynecology: { visits: 5000, surgeries: 300 },
    pediatrics: { visits: 8000, vaccinations: 6000 },
    oncology: { screening: 3000, diagnosed: 200, chemo: 150, radiotherapy: 100, followup: 400 },
    quality: { avgStayDays: 7, readmissionRate: 0.05 },
    suggestions: ['加强高危妊娠管理', '提高肿瘤筛查覆盖率'],
  };
}
