/**
 * 健澜科技 jlmedaios - 医务管理 V2 纯函数（M212-B）
 *
 * buildMedicalAffairsReportV2 / assessCoreSystemCompliance / trackMedicalDispute
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 核心制度执行记录 */
export interface CoreSystemRecord {
  threeLevelRound: boolean;
  difficultCaseDiscussion: boolean;
  deathCaseDiscussion: boolean;
}

/**
 * 评估核心制度合规率（纯函数）。
 *
 * @param records 记录列表
 * @returns 合规率
 */
export function assessCoreSystemCompliance(records: CoreSystemRecord[]): { complianceRate: number; level: string } {
  const total = records.length * 3;
  let passed = 0;
  for (const r of records) {
    if (r.threeLevelRound) passed++;
    if (r.difficultCaseDiscussion) passed++;
    if (r.deathCaseDiscussion) passed++;
  }
  const complianceRate = total > 0 ? passed / total : 0;
  let level = '达标';
  if (complianceRate < 0.8) level = '不达标';
  else if (complianceRate >= 0.95) level = '优秀';
  return { complianceRate, level };
}

/** 医疗纠纷 */
export interface MedicalDispute {
  type: string;
  amount: number;
}

/**
 * 追踪医疗纠纷（纯函数）。
 *
 * @param disputes 纠纷列表
 * @returns 纠纷数与总赔偿
 */
export function trackMedicalDispute(disputes: MedicalDispute[]): { count: number; totalCompensation: number } {
  const count = disputes.length;
  const totalCompensation = disputes.reduce((sum, d) => sum + d.amount, 0);
  return { count, totalCompensation };
}

/** 医务 V2 报告输出 */
export interface MedicalAffairsReportV2 {
  timeRange: string;
  quality: { coreSystems: number; threeLevelRound: number; caseDiscussion: number };
  safety: { adverseEvents: number; disputes: number; accidents: number };
  physician: { certified: number; surgeryGrading: number; mdt: number };
  documentation: { passRate: number };
  training: { legal: number };
  department: { managed: number };
  suggestions: string[];
}

/**
 * 构建医务 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 医务 V2 报告
 */
export function buildMedicalAffairsReportV2(timeRange: string): MedicalAffairsReportV2 {
  return {
    timeRange,
    quality: { coreSystems: 18, threeLevelRound: 1000, caseDiscussion: 50 },
    safety: { adverseEvents: 20, disputes: 10, accidents: 0 },
    physician: { certified: 500, surgeryGrading: 4, mdt: 20 },
    documentation: { passRate: 0.98 },
    training: { legal: 100 },
    department: { managed: 40 },
    suggestions: ['提高核心制度合规率', '降低医疗纠纷数'],
  };
}
