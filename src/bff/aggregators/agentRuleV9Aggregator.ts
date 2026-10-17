/**
 * 健澜科技 jlmedaios - 从反馈沉淀个性化推荐规则 V9 纯函数（M291-B）
 *
 * distillRulesV9 / rankRecommendV9 / buildRuleLibraryV9
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 反馈事件（V9） */
export interface FeedbackEventV9 {
  role: "doctor" | "nurse" | "pharma" | "manager";
  pattern: string;
  eventType: "adopt" | "reject" | "correct";
}

/** 沉淀规则 */
export interface DistilledRule {
  id: string;
  role: "doctor" | "nurse" | "pharma" | "manager";
  pattern: string;
  weight: number;
  sourceCnt: number;
  enabled: boolean;
}

/**
 * 规则提炼 V9（纯函数）：按 pattern 聚合，采纳+权重、拒绝降权；weight clamp 0.1-1.0。
 *
 * 规则：每条 pattern 的权重 = 0.5 + adopt×0.05 − reject×0.03 + correct×0.02（clamp 0.1-1.0）；
 * sourceCnt = 该 pattern 出现的事件总数。
 *
 * @param events 反馈事件列表
 * @returns 沉淀规则列表
 */
export function distillRulesV9(events: FeedbackEventV9[]): DistilledRule[] {
  const bucket = new Map<string, { role: FeedbackEventV9["role"]; adopt: number; reject: number; correct: number; total: number }>();
  for (const e of events) {
    const key = `${e.role}::${e.pattern}`;
    const cur = bucket.get(key) ?? { role: e.role, adopt: 0, reject: 0, correct: 0, total: 0 };
    cur.total += 1;
    if (e.eventType === "adopt") cur.adopt += 1;
    else if (e.eventType === "reject") cur.reject += 1;
    else cur.correct += 1;
    bucket.set(key, cur);
  }
  return Array.from(bucket.entries()).map(([key, v]) => {
    const raw = 0.5 + v.adopt * 0.05 - v.reject * 0.03 + v.correct * 0.02;
    const weight = Math.round(Math.min(1.0, Math.max(0.1, raw)) * 100) / 100;
    return {
      id: key,
      role: v.role,
      pattern: key.split("::")[1],
      weight,
      sourceCnt: v.total,
      enabled: weight >= 0.3,
    };
  });
}

/**
 * 推荐排序 V9（纯函数）：按 weight 降序，仅返回 enabled 规则。
 *
 * @param rules 规则列表
 * @param context 当前场景（role 过滤）
 * @returns 排序后规则
 */
export function rankRecommendV9(rules: DistilledRule[], context: { role: DistilledRule["role"] }): DistilledRule[] {
  return rules
    .filter((r) => r.enabled && r.role === context.role)
    .sort((a, b) => b.weight - a.weight);
}

/**
 * 规则库统计 V9（纯函数）。
 *
 * @param rules 规则列表
 * @returns 统计
 */
export function buildRuleLibraryV9(rules: DistilledRule[]): {
  totalRules: number;
  enabledRules: number;
  highWeightRules: number;
} {
  return {
    totalRules: rules.length,
    enabledRules: rules.filter((r) => r.enabled).length,
    highWeightRules: rules.filter((r) => r.weight >= 0.7).length,
  };
}
