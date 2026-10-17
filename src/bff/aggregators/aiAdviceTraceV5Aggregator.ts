/**
 * 健澜科技 jlmedaios - AI 建议全链路审计 V5 纯函数（M276-A）
 *
 * recordAdviceV5 / assessAdviceQualityV5 / explainAdviceV5 / buildAIAdviceTraceV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 建议审计记录 */
export interface AdviceTrace {
  id: string;
  adviceType: string;
  patientRef: string;
  inputSnapshot: string;
  evidenceRefs: string[];
  confidence: number;
  suggestedAction: string;
  adopted: boolean;
  overrideReviewedBy: string;
  overrideReason: string;
}

/**
 * 记录 AI 建议 V5（纯函数）。
 *
 * @param params 建议字段
 * @returns 审计记录
 */
export function recordAdviceV5(params: Omit<AdviceTrace, "id">): AdviceTrace {
  return { ...params, id: `advice-${Date.now()}` };
}

/**
 * 评估建议质量 V5（纯函数）。
 *
 * @param traces 审计记录列表
 * @returns 质量指标
 */
export function assessAdviceQualityV5(traces: AdviceTrace[]): {
  total: number;
  adoptionRate: number;
  avgConfidence: number;
  overrideRate: number;
  adoptedCount: number;
  overriddenCount: number;
} {
  const total = traces.length;
  const adoptedCount = traces.filter((t) => t.adopted).length;
  const overriddenCount = traces.filter((t) => !t.adopted && t.overrideReviewedBy.length > 0).length;
  const avgConfidence = total > 0
    ? Math.round((traces.reduce((s, t) => s + t.confidence, 0) / total) * 100) / 100
    : 0;
  const adoptionRate = total > 0 ? Math.round((adoptedCount / total) * 1000) / 10 : 0;
  const overrideRate = total > 0 ? Math.round((overriddenCount / total) * 1000) / 10 : 0;
  return { total, adoptionRate, avgConfidence, overrideRate, adoptedCount, overriddenCount };
}

/**
 * 生成可解释依据 V5（纯函数）。
 *
 * @param advice 建议
 * @returns 可解释文本
 */
export function explainAdviceV5(advice: AdviceTrace): { explanation: string; confidence: number; evidenceCount: number } {
  const evidenceCount = advice.evidenceRefs.length;
  const explanation = `基于 ${evidenceCount} 条证据（${advice.evidenceRefs.join("、")}），置信度 ${Math.round(advice.confidence * 100)}%，建议：${advice.suggestedAction}。`;
  return { explanation, confidence: advice.confidence, evidenceCount };
}

/** AI 建议审计看板输出 */
export interface AIAdviceTraceV5Report {
  quality: {
    total: number;
    adoptionRate: number;
    avgConfidence: number;
    overrideRate: number;
    adoptedCount: number;
    overriddenCount: number;
  };
  byType: Record<string, number>;
  suggestions: string[];
}

/**
 * 构建 AI 建议审计看板（纯函数）。
 *
 * @param traces 审计记录
 * @returns 报告
 */
export function buildAIAdviceTraceV5Report(traces: AdviceTrace[]): AIAdviceTraceV5Report {
  const byType: Record<string, number> = {};
  for (const t of traces) {
    byType[t.adviceType] = (byType[t.adviceType] ?? 0) + 1;
  }
  const quality = assessAdviceQualityV5(traces);
  return {
    quality,
    byType,
    suggestions: quality.adoptionRate < 60
      ? ["采纳率偏低，需提升建议准确率与可解释性"]
      : ["采纳率良好，持续优化低置信度场景"],
  };
}
