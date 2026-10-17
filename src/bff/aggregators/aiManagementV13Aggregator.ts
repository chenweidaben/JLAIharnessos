/**
 * 健澜科技 jlmedaios - AI 管理应用 V13 纯函数（M366-C）
 *
 * computeAiOperationDecisionCountV13 / computeAiResourceDispatchCountV13 / computeAiWarningAccuracyRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 管理应用记录 */
export interface AiManagementRecordV13 {
  operationDecisionCount: number;
  resourceDispatchCount: number;
  warningTotal: number;
  warningAccurate: number;
}

/**
 * AI 运营决策数（纯函数）：求和。
 *
 * @param records AI 管理应用记录列表
 * @returns AI 运营决策数
 */
export function computeAiOperationDecisionCountV13(records: AiManagementRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.operationDecisionCount, 0);
}

/**
 * AI 资源调度次数（纯函数）：求和。
 *
 * @param records AI 管理应用记录列表
 * @returns AI 资源调度次数
 */
export function computeAiResourceDispatchCountV13(records: AiManagementRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.resourceDispatchCount, 0);
}

/**
 * AI 预警准确率（纯函数）：准确预警数/预警数×100，保留 2 位小数。
 *
 * @param records AI 管理应用记录列表
 * @returns AI 预警准确率百分比
 */
export function computeAiWarningAccuracyRateV13(records: AiManagementRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.warningTotal, 0);
  if (total === 0) return 0;
  const accurate = records.reduce((acc, r) => acc + r.warningAccurate, 0);
  return Math.round((accurate / total) * 10000) / 100;
}
