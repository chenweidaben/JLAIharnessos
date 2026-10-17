/**
 * 健澜科技 jlmedaios - Agent 反馈与经验沉淀 V8 纯函数（M291-A）
 *
 * recordAgentFeedbackV8 / adjustAgentWeightV8 / buildAgentLearningSummaryV8
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** Agent 反馈事件 */
export interface AgentFeedbackEvent {
  role: "doctor" | "nurse" | "pharma" | "manager";
  eventType: "adopt" | "reject" | "correct";
  createdAt: number;
}

/**
 * 记录反馈 V8（纯函数）：追加到 history，返回新数组（不修改原数组）。
 *
 * @param event 新事件
 * @param history 历史事件
 * @returns 新历史数组
 */
export function recordAgentFeedbackV8(event: AgentFeedbackEvent, history: AgentFeedbackEvent[]): AgentFeedbackEvent[] {
  return [...history, event];
}

/**
 * 权重调整 V8（纯函数）：adopt +0.05 / reject -0.03 / correct +0.02；clamp [0.1, 1.0]。
 *
 * @param history 历史事件（按 role 过滤）
 * @param eventType 事件类型
 * @param initialWeight 初始权重
 * @returns 调整后权重
 */
export function adjustAgentWeightV8(
  history: AgentFeedbackEvent[],
  eventType: AgentFeedbackEvent["eventType"],
  initialWeight: number,
): number {
  const deltaMap: Record<AgentFeedbackEvent["eventType"], number> = {
    adopt: 0.05,
    reject: -0.03,
    correct: 0.02,
  };
  const count = history.filter((h) => h.eventType === eventType).length;
  const next = initialWeight + count * deltaMap[eventType];
  return Math.round(Math.min(1.0, Math.max(0.1, next)) * 100) / 100;
}

/**
 * 学习摘要 V8（纯函数）：adoptRate/correctRate/沉淀规则数（=事件总数）。
 *
 * @param history 该 role 的历史事件
 * @returns 摘要
 */
export function buildAgentLearningSummaryV8(history: AgentFeedbackEvent[]): {
  totalEvents: number;
  adoptRatePct: number;
  correctRatePct: number;
} {
  if (history.length === 0) {
    return { totalEvents: 0, adoptRatePct: 0, correctRatePct: 0 };
  }
  const adoptCnt = history.filter((h) => h.eventType === "adopt").length;
  const correctCnt = history.filter((h) => h.eventType === "correct").length;
  return {
    totalEvents: history.length,
    adoptRatePct: Math.round((adoptCnt / history.length) * 1000) / 10,
    correctRatePct: Math.round((correctCnt / history.length) * 1000) / 10,
  };
}
