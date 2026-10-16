/**
 * 健澜科技 jlmedaios - 国考绩效 55 指标 V5 纯函数（M267-A）
 *
 * buildNationalExamV5Report / scoreNationalExamV5 / identifyWeakIndicatorsV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 国考总分 V5（纯函数）。
 *
 * @param indicators 指标得分
 * @param weights 权重
 * @returns 总分
 */
export function scoreNationalExamV5(indicators: { name: string; score: number }[], weights: { name: string; weight: number }): { total: number; grade: string; rank: string } {
  let total = 0;
  let weightSum = 0;
  for (const ind of indicators) {
    const w = weights.name === ind.name ? weights.weight : 1;
    total += ind.score * w;
    weightSum += w;
  }
  total = weightSum > 0 ? total / weightSum : 0;
  let grade = "B";
  let rank = "全国中游";
  if (total >= 90) {
    grade = "A+";
    rank = "全国前10%";
  } else if (total >= 80) {
    grade = "A";
    rank = "全国前25%";
  } else if (total >= 70) {
    grade = "B";
    rank = "全国中游";
  } else if (total >= 60) {
    grade = "C";
    rank = "全国后25%";
  } else {
    grade = "D";
    rank = "全国后10%";
  }
  return { total: Math.round(total * 10) / 10, grade, rank };
}

/**
 * 识别短板指标 V5（纯函数）。
 *
 * @param scores 得分
 * @param benchmarks 对标
 * @returns 短板
 */
export function identifyWeakIndicatorsV5(scores: { name: string; score: number }[], benchmarks: { name: string; avg: number }): { weak: string[]; critical: string[]; action: string[] } {
  const weak: string[] = [];
  const critical: string[] = [];
  const action: string[] = [];
  for (const s of scores) {
    const b = benchmarks.name === s.name ? benchmarks.avg : 80;
    if (s.score < b - 10) {
      critical.push(s.name);
      action.push(`${s.name}: 低于全国均值 ${Math.round(b - s.score)} 分，需专项改进`);
    } else if (s.score < b) {
      weak.push(s.name);
    }
  }
  return { weak, critical, action };
}

/** 国考绩效 55 指标 V5 报告输出 */
export interface NationalExamV5Report {
  timeRange: string;
  medicalQuality: { grade4Surgery: number; lowRiskMortality: number; grade3Surgery: number; tcmNonDrug: number; drgAbility: number };
  operational: { los: number; outpatientCost: number; inpatientCost: number; serviceRevenue: number; staffExpense: number };
  sustained: { anesthesiaRatio: number; pediatricRatio: number; pathologistRatio: number; talent: number; researchFund: number; title: number };
  satisfaction: { outpatient: number; inpatient: number; staff: number; complaint: number; dispute: number; experience: number };
  decomposition: { hospital: number; dept: number; person: number; threshold: number; ryG: number; yoy: number; benchmark: number };
  weakness: { lagging: number; rootCause: number; action: number; dept: number; pdca: number; followup: number };
  dataQuality: { definition: number; source: number; auto: number; manual: number; validation: number; report: number };
  dashboard: { dashboard: number; radar: number; trend: number; ranking: number; cockpit: number };
  metrics: { total: number; grade: string; rank: string; weakCount: number; criticalCount: number };
  suggestions: string[];
}

/**
 * 构建国考绩效 55 指标 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 国考绩效 55 指标 V5 报告
 */
export function buildNationalExamV5Report(timeRange: string): NationalExamV5Report {
  return {
    timeRange,
    medicalQuality: { grade4Surgery: 35, lowRiskMortality: 0.5, grade3Surgery: 60, tcmNonDrug: 20, drgAbility: 75 },
    operational: { los: 8.5, outpatientCost: 350, inpatientCost: 12000, serviceRevenue: 30, staffExpense: 40 },
    sustained: { anesthesiaRatio: 2, pediatricRatio: 5, pathologistRatio: 1.5, talent: 60, researchFund: 500, title: 70 },
    satisfaction: { outpatient: 90, inpatient: 92, staff: 85, complaint: 5, dispute: 2, experience: 88 },
    decomposition: { hospital: 100, dept: 85, person: 75, threshold: 90, ryG: 85, yoy: 80, benchmark: 75 },
    weakness: { lagging: 8, rootCause: 6, action: 7, dept: 8, pdca: 7, followup: 6 },
    dataQuality: { definition: 95, source: 90, auto: 85, manual: 15, validation: 90, report: 95 },
    dashboard: { dashboard: 100, radar: 100, trend: 100, ranking: 100, cockpit: 100 },
    metrics: { total: 78.5, grade: "B", rank: "全国前25%", weakCount: 8, criticalCount: 3 },
    suggestions: ["提升四级手术占比", "降低平均住院日"],
  };
}
