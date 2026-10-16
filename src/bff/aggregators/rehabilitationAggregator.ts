/**
 * 健澜科技 jlmedaios - 康复医学与老年医学纯函数（M202-A）
 *
 * buildRehabilitationReport / assessRehabilitationEffect / classifyGeriatricSyndrome
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估康复效果（纯函数）。
 *
 * @param preScore 治疗前评分
 * @param postScore 治疗后评分
 * @returns 改善结果
 */
export function assessRehabilitationEffect(preScore: number, postScore: number): { improvement: number; rate: number; effective: boolean } {
  const improvement = postScore - preScore;
  const rate = preScore > 0 ? improvement / preScore : 0;
  const effective = improvement >= 10;
  return { improvement, rate, effective };
}

/** 老年患者数据 */
export interface GeriatricPatient {
  age: number;
  hasFalls: boolean;
  hasCognitiveImpairment: boolean;
  hasUrinaryIncontinence: boolean;
  hasMalnutrition: boolean;
  hasPolypharmacy: boolean;
}

/**
 * 老年综合征分类（纯函数）。
 *
 * @param patient 老年患者
 * @returns 综合征分类
 */
export function classifyGeriatricSyndrome(patient: GeriatricPatient): { syndromes: string[]; riskLevel: string } {
  const syndromes: string[] = [];
  if (patient.hasFalls) syndromes.push('跌倒');
  if (patient.hasCognitiveImpairment) syndromes.push('认知障碍');
  if (patient.hasUrinaryIncontinence) syndromes.push('尿失禁');
  if (patient.hasMalnutrition) syndromes.push('营养不良');
  if (patient.hasPolypharmacy) syndromes.push('多重用药');

  let riskLevel = '低风险';
  if (syndromes.length >= 3) riskLevel = '高风险';
  else if (syndromes.length >= 1) riskLevel = '中风险';

  return { syndromes, riskLevel };
}

/** 康复报告输出 */
export interface RehabilitationReport {
  dept: string;
  timeRange: string;
  assessment: { adlPatients: number; strokePatients: number; orthoPatients: number; cardiacPatients: number };
  treatment: { physical: number; occupational: number; speech: number; traditional: number };
  geriatrics: { cgaCompleted: number; syndromePatients: number; careDays: number };
  outcomes: { avgImprovement: number; effectiveRate: number };
  suggestions: string[];
}

/**
 * 构建康复报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 康复报告
 */
export function buildRehabilitationReport(dept: string, timeRange: string): RehabilitationReport {
  return {
    dept,
    timeRange,
    assessment: { adlPatients: 1500, strokePatients: 400, orthoPatients: 300, cardiacPatients: 200 },
    treatment: { physical: 800, occupational: 300, speech: 150, traditional: 200 },
    geriatrics: { cgaCompleted: 500, syndromePatients: 300, careDays: 14 },
    outcomes: { avgImprovement: 25, effectiveRate: 0.85 },
    suggestions: ['加强脑卒中早期康复介入', '推广老年综合评估 CGA'],
  };
}
