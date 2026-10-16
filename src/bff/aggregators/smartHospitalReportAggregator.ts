/**
 * 健澜科技 jlmedaios - 智慧医院评价体系纯函数（M210-A）
 *
 * buildSmartHospitalReport / scoreSmartHospital / identifySmartHospitalGaps
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 评价维度得分 */
export interface SmartHospitalCriteria {
  smartMedical: number;
  smartService: number;
  smartManagement: number;
}

/**
 * 智慧医院评分（纯函数）。
 *
 * @param c 三维度得分（满分各 100）
 * @returns 总分与等级
 */
export function scoreSmartHospital(c: SmartHospitalCriteria): { total: number; level: string } {
  const total = c.smartMedical + c.smartService + c.smartManagement;
  let level = '未达标';
  if (total >= 270) level = '五星级';
  else if (total >= 240) level = '四星级';
  else if (total >= 200) level = '三星级';
  return { total, level };
}

/**
 * 识别智慧医院差距（纯函数）。
 *
 * @param scores 当前得分
 * @returns 差距项
 */
export function identifySmartHospitalGaps(scores: SmartHospitalCriteria): string[] {
  const gaps: string[] = [];
  if (scores.smartMedical < 90) gaps.push('智慧医疗不足');
  if (scores.smartService < 90) gaps.push('智慧服务不足');
  if (scores.smartManagement < 90) gaps.push('智慧管理不足');
  return gaps;
}

/** 智慧医院评价报告输出 */
export interface SmartHospitalReport {
  timeRange: string;
  triad: SmartHospitalCriteria;
  platform: { integrated: boolean };
  patientExperience: { nps: number };
  employeeExperience: { satisfaction: number };
  readiness: { selfAssessment: number; gapAnalysis: number; rectification: number };
  suggestions: string[];
}

/**
 * 构建智慧医院评价报告。
 *
 * @param timeRange 时间范围
 * @returns 智慧医院评价报告
 */
export function buildSmartHospitalReport(timeRange: string): SmartHospitalReport {
  return {
    timeRange,
    triad: { smartMedical: 85, smartService: 80, smartManagement: 75 },
    platform: { integrated: true },
    patientExperience: { nps: 60 },
    employeeExperience: { satisfaction: 0.85 },
    readiness: { selfAssessment: 1, gapAnalysis: 1, rectification: 1 },
    suggestions: ['加强智慧管理建设', '提高患者体验 NPS'],
  };
}
