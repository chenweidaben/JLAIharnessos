/**
 * 健澜科技 jlmedaios - AI 辅助诊断（统计）V13 纯函数（M366-A，stats避让）
 *
 * computeAiDiagnosisRateV13 / computeAiDiagnosisAccuracyV13 / computeAiSuggestionAdoptionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 辅助诊断（统计）记录 */
export interface AiDiagnosisStatsRecordV13 {
  caseCount: number;
  aiAssisted: number;
  aiAccurate: number;
  aiSuggestionAdopted: number;
}

/**
 * AI 辅助诊断率（纯函数）：AI 辅助诊断数/病例数×100，保留 2 位小数。
 *
 * @param records AI 辅助诊断记录列表
 * @returns AI 辅助诊断率百分比
 */
export function computeAiDiagnosisRateV13(records: AiDiagnosisStatsRecordV13[]): number {
  const cases = records.reduce((acc, r) => acc + r.caseCount, 0);
  if (cases === 0) return 0;
  const assisted = records.reduce((acc, r) => acc + r.aiAssisted, 0);
  return Math.round((assisted / cases) * 10000) / 100;
}

/**
 * AI 诊断准确率（纯函数）：准确数/AI 诊断数×100，保留 2 位小数。
 *
 * @param records AI 辅助诊断记录列表
 * @returns AI 诊断准确率百分比
 */
export function computeAiDiagnosisAccuracyV13(records: AiDiagnosisStatsRecordV13[]): number {
  const assisted = records.reduce((acc, r) => acc + r.aiAssisted, 0);
  if (assisted === 0) return 0;
  const accurate = records.reduce((acc, r) => acc + r.aiAccurate, 0);
  return Math.round((accurate / assisted) * 10000) / 100;
}

/**
 * AI 建议采纳率（纯函数）：采纳数/AI 建议数×100，保留 2 位小数。
 *
 * @param records AI 辅助诊断记录列表
 * @returns AI 建议采纳率百分比
 */
export function computeAiSuggestionAdoptionRateV13(records: AiDiagnosisStatsRecordV13[]): number {
  const assisted = records.reduce((acc, r) => acc + r.aiAssisted, 0);
  if (assisted === 0) return 0;
  const adopted = records.reduce((acc, r) => acc + r.aiSuggestionAdopted, 0);
  return Math.round((adopted / assisted) * 10000) / 100;
}
