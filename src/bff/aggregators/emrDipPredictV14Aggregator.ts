/**
 * 健澜科技 jlmedaios - DIP 分值预测 V14 聚合器（M535-D）
 *
 * 纯函数：构建 DIP 预测基础数据 + DIP 分值预测 + 构建 DIP 预测报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** DIP 预测基础数据 */
export interface DipPredictV14 {
  recordId: string;
  mainDiagnosis: string;
}

/** DIP 预测输入 */
export interface DipPredictInputV14 {
  mainDiagnosis: string;
  treatmentCount: number;
  cost: number;
}

/** DIP 预测结果 */
export interface DipPredictResultV14 {
  dipScore: number;
  level: string;
}

/** DIP 预测报告 */
export interface DipPredictReportV14 {
  dipScore: number;
  level: string;
}

/**
 * 构建 DIP 预测基础数据。
 *
 * @param recordId 病历ID
 * @param mainDiagnosis 主诊断
 * @returns DIP 预测基础数据
 */
export function buildDipPredict(recordId: string, mainDiagnosis: string): DipPredictV14 {
  return { recordId, mainDiagnosis };
}

/**
 * DIP 分值预测。
 * dipScore = Math.round((treatmentCount * 10 + cost / 100) * 10) / 10（保留1位小数）
 * level = dipScore >= 100 ? 'A' : dipScore >= 50 ? 'B' : 'C'
 *
 * @param input 预测输入（主诊断 + 治疗项数 + 费用）
 * @returns 预测结果（dipScore + level）
 */
export function predictDipScore(input: DipPredictInputV14): DipPredictResultV14 {
  // 手算：dipScore = Math.round((treatmentCount * 10 + cost / 100) * 10) / 10
  // 测试2：treatmentCount=8, cost=5000 → Math.round((80 + 50) * 10) / 10 = Math.round(1300) / 10 = 1300 / 10 = 130.0
  // 测试3：treatmentCount=3, cost=2000 → Math.round((30 + 20) * 10) / 10 = Math.round(500) / 10 = 500 / 10 = 50.0
  const dipScore = Math.round((input.treatmentCount * 10 + input.cost / 100) * 10) / 10;
  // 手算：level = dipScore >= 100 ? 'A' : dipScore >= 50 ? 'B' : 'C'
  // 测试2：dipScore=130.0 ≥ 100 → level='A'
  // 测试3：dipScore=50.0 ≥ 50 → level='B'
  const level = dipScore >= 100 ? "A" : dipScore >= 50 ? "B" : "C";
  return { dipScore, level };
}

/**
 * 构建 DIP 预测报告。
 *
 * @param result 预测结果
 * @returns 预测报告（dipScore + level 透传）
 */
export function buildDipPredictReport(result: DipPredictResultV14): DipPredictReportV14 {
  // 手算：透传 dipScore + level
  // 测试4：{dipScore=130.0, level='A'} → dipScore=130.0, level='A'
  return { dipScore: result.dipScore, level: result.level };
}
