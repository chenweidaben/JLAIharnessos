/**
 * 健澜科技 jlmedaios - 质量管理体系完善纯函数（M193-C）
 *
 * buildQualitySystemReport / scoreQualitySystem / generateQualityImprovementPlan
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 质量体系数据 */
export interface QualitySystemData {
  committeeEstablished: boolean;
  standardsCoverage: number;
  trainingHours: number;
  inspectionFrequency: number;
  pdcaProjects: number;
  qccProjects: number;
  rcaProjects: number;
  nationalGoalsAchieved: number;
}

/**
 * 质量体系评分（纯函数）。
 *
 * @param data 质量体系数据
 * @returns 0-100 分
 */
export function scoreQualitySystem(data: QualitySystemData): number {
  let score = 0;
  if (data.committeeEstablished) score += 10;
  score += data.standardsCoverage * 20;
  score += Math.min(data.trainingHours / 10, 20);
  score += Math.min(data.inspectionFrequency * 2, 15);
  score += Math.min(data.pdcaProjects * 2, 15);
  score += Math.min(data.nationalGoalsAchieved * 2, 20);
  return Math.min(100, Math.round(score));
}

/**
 * 质量改进计划生成（纯函数）。
 *
 * @param scoreResult 评分结果
 * @returns 改进建议
 */
export function generateQualityImprovementPlan(scoreResult: { score: number; gaps: string[] }): string[] {
  const plans: string[] = [];
  if (scoreResult.score < 80) {
    plans.push('完善质量委员会组织架构');
    plans.push('加大质量培训力度');
    plans.push('增加 PDCA/QCC/RCA 改进项目');
  } else {
    plans.push('保持现有质量体系水平');
    plans.push('争创国家级质量奖');
  }
  return plans;
}

/** 质量体系报告输出 */
export interface QualitySystemReport {
  dept: string;
  timeRange: string;
  organization: { committee: boolean; qualityGroups: number; qualityOfficers: number };
  standards: { coverage: number; updated: number };
  training: { hours: number; coverage: number };
  inspection: { frequency: number; problems: number };
  improvement: { pdca: number; qcc: number; rca: number };
  nationalGoals: { total: number; achieved: number; details: string[] };
  score: number;
  suggestions: string[];
}

/**
 * 构建质量体系报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 质量体系报告
 */
export function buildQualitySystemReport(dept: string, timeRange: string): QualitySystemReport {
  const qData: QualitySystemData = {
    committeeEstablished: true,
    standardsCoverage: 0.9,
    trainingHours: 25,
    inspectionFrequency: 8,
    pdcaProjects: 6,
    qccProjects: 4,
    rcaProjects: 2,
    nationalGoalsAchieved: 7,
  };

  const score = scoreQualitySystem(qData);
  const gaps = ['部分科室质控小组未正常运转', '质量培训覆盖率偏低'];
  const suggestions = generateQualityImprovementPlan({ score, gaps });

  return {
    dept,
    timeRange,
    organization: { committee: true, qualityGroups: 35, qualityOfficers: 120 },
    standards: { coverage: 0.9, updated: 15 },
    training: { hours: 25, coverage: 0.85 },
    inspection: { frequency: 8, problems: 12 },
    improvement: { pdca: 6, qcc: 4, rca: 2 },
    nationalGoals: {
      total: 10,
      achieved: 7,
      details: ['提高手术安全核查率', '降低医院感染发生率', '提升患者安全目标达成率'],
    },
    score,
    suggestions,
  };
}
