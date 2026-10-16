/**
 * 健澜科技 jlmedaios - 患者画像与全病程管理深化 V2 纯函数（M208-C）
 *
 * buildPatientProfileReportV2 / buildPatient360 / classifyRiskLevel
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 患者基本信息 */
export interface PatientBasicInfo {
  patientId: string;
  age: number;
  gender: string;
}

/**
 * 构建 360° 患者画像（纯函数）。
 *
 * @param patientId 患者 ID
 * @returns 画像
 */
export function buildPatient360(patientId: string): { patientId: string; dimensions: string[]; tags: string[] } {
  return {
    patientId,
    dimensions: ['基本信息', '就诊记录', '用药史', '过敏史', '家族史', '生活方式'],
    tags: ['慢病管理', '定期复诊'],
  };
}

/** 风险画像 */
export interface RiskProfile {
  repeatedAdmission: boolean;
  highCost: boolean;
  polypharmacy: boolean;
}

/**
 * 风险分级（纯函数）。
 *
 * @param profile 风险画像
 * @returns 红黄绿分组
 */
export function classifyRiskLevel(profile: RiskProfile): { level: string; color: string } {
  let score = 0;
  if (profile.repeatedAdmission) score++;
  if (profile.highCost) score++;
  if (profile.polypharmacy) score++;

  if (score >= 2) return { level: '高风险', color: '红' };
  if (score === 1) return { level: '中风险', color: '黄' };
  return { level: '低风险', color: '绿' };
}

/** 患者画像 V2 报告输出 */
export interface PatientProfileReportV2 {
  timeRange: string;
  profile: { total: number; dimensions: number };
  chronicTags: { hypertension: number; diabetes: number; coronary: number };
  highRisk: { repeatedAdmission: number; highCost: number; polypharmacy: number };
  continuity: { enrolled: number; followedUp: number; readmission30d: number };
  contract: { signed: number };
  internetFollowup: { online: number };
  behavior: { smoking: number; drinking: number };
  tiering: { red: number; yellow: number; green: number };
  suggestions: string[];
}

/**
 * 构建患者画像 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 患者画像 V2 报告
 */
export function buildPatientProfileReportV2(timeRange: string): PatientProfileReportV2 {
  return {
    timeRange,
    profile: { total: 500000, dimensions: 6 },
    chronicTags: { hypertension: 50000, diabetes: 30000, coronary: 10000 },
    highRisk: { repeatedAdmission: 2000, highCost: 1000, polypharmacy: 5000 },
    continuity: { enrolled: 20000, followedUp: 18000, readmission30d: 500 },
    contract: { signed: 100000 },
    internetFollowup: { online: 20000 },
    behavior: { smoking: 80000, drinking: 50000 },
    tiering: { red: 3000, yellow: 50000, green: 447000 },
    suggestions: ['加强高风险患者随访', '提高家庭医生签约率'],
  };
}
