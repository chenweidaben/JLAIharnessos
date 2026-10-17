/**
 * 健澜科技 jlmedaios - MUSE 成本与 ROI 分析 V5 纯函数（M285-D）
 *
 * calculateAICostV5 / estimateROIV5 / optimizeModelMixV5 / buildMuseROIV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 成本条目 */
export interface CostEntry {
  model: string;
  tokenIn: number;
  tokenOut: number;
  costCny: number;
  savedValueCny: number;
}

/** 模型定价（元/千token） */
const MODEL_PRICING: Record<string, { in: number; out: number }> = {
  "gpt-4": { in: 0.03, out: 0.06 },
  "gpt-4o-mini": { in: 0.0015, out: 0.006 },
  "deepseek": { in: 0.001, out: 0.002 },
};

/**
 * AI 成本估算 V5（纯函数）：按模型定价计算元。
 *
 * @param tokensIn 输入token数
 * @param tokensOut 输出token数
 * @param model 模型
 * @returns 成本（元）
 */
export function calculateAICostV5(tokensIn: number, tokensOut: number, model: string): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING["deepseek"];
  const cost = (tokensIn / 1000) * pricing.in + (tokensOut / 1000) * pricing.out;
  return Math.round(cost * 10000) / 10000;
}

/**
 * ROI 估算 V5（纯函数）：(saved-cost)/cost×100%。
 *
 * @param cost 成本元
 * @param saved 节省价值元
 * @returns ROI%
 */
export function estimateROIV5(cost: number, saved: number): number {
  if (cost === 0) return 0;
  return Math.round(((saved - cost) / cost) * 1000) / 10;
}

/**
 * 模型组合优化 V5（纯函数）：把高成本调用路由到便宜模型，质量损失<10%即可替换。
 *
 * @param entries 成本条目
 * @returns 建议
 */
export function optimizeModelMixV5(entries: CostEntry[]): { recommended: string; savings: number } {
  let savings = 0;
  for (const e of entries) {
    // gpt-4 替换为 deepseek 的节省
    if (e.model === "gpt-4") {
      const newCost = calculateAICostV5(e.tokenIn, e.tokenOut, "deepseek");
      savings += Math.max(0, e.costCny - newCost);
    }
  }
  return {
    recommended: savings > 100 ? "gpt-4→deepseek 替换" : "保持现状",
    savings: Math.round(savings * 100) / 100,
  };
}

/** ROI 看板输出 */
export interface MuseROIV5Report {
  totalCost: number;
  totalSaved: number;
  overallROI: number;
  costPerSession: number;
}

/**
 * 构建 ROI 看板（纯函数）。
 *
 * @param entries 成本条目
 * @param sessions 总会话数
 * @returns 看板
 */
export function buildMuseROIV5Report(entries: CostEntry[], sessions: number): MuseROIV5Report {
  const totalCost = entries.reduce((s, e) => s + e.costCny, 0);
  const totalSaved = entries.reduce((s, e) => s + e.savedValueCny, 0);
  return {
    totalCost: Math.round(totalCost * 100) / 100,
    totalSaved: Math.round(totalSaved * 100) / 100,
    overallROI: estimateROIV5(totalCost, totalSaved),
    costPerSession: sessions > 0 ? Math.round((totalCost / sessions) * 10000) / 10000 : 0,
  };
}
