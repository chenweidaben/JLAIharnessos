/**
 * 健澜科技 jlmedaios - 病历缺陷根因分析 V14 聚合器（M468-B）
 *
 * 纯函数：缺陷频次统计 + 因果树构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 根因分析结果 */
export interface RootCauseAnalysisV14 {
  cause: string;
  count: number;
  percent: number;
}

/** 因果树 */
export interface CauseTreeV14 {
  rootCause: string;
  subCauses: string[];
}

/**
 * 统计缺陷类型频次，按频次降序，percent=count/总缺陷×100（四舍五入取整）。
 *
 * @param defects 缺陷类型列表
 * @returns 分析结果（降序）
 */
export function analyzeRootCause(defects: string[]): RootCauseAnalysisV14[] {
  if (defects.length === 0) return [];
  const total = defects.length;
  const freq = new Map<string, number>();
  for (const d of defects) {
    freq.set(d, (freq.get(d) ?? 0) + 1);
  }
  const result: RootCauseAnalysisV14[] = Array.from(freq.entries()).map(([cause, count]) => ({
    cause,
    count,
    percent: Math.round((count / total) * 100),
  }));
  return result.sort((a, b) => b.count - a.count);
}

/**
 * 构建因果树：频次最高的为根因，其余为子因。
 *
 * @param analysis 分析结果（降序）
 * @returns 因果树
 */
export function buildCauseTree(analysis: RootCauseAnalysisV14[]): CauseTreeV14 {
  if (analysis.length === 0) {
    return { rootCause: "", subCauses: [] };
  }
  const rootCause = analysis[0]?.cause ?? "";
  const subCauses = analysis.slice(1).map((a) => a.cause);
  return { rootCause, subCauses };
}
