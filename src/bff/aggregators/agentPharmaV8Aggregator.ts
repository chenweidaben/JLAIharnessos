/**
 * 健澜科技 jlmedaios - 药师 Personal Agent（Pharma MUSE）工作台 V8 纯函数（M290-C）
 *
 * buildPharmaTodoV8 / prioritizePharmaV8 / buildPharmaDigestV8
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 药师待办 */
export interface PharmaTodo {
  id: string;
  type: "interactionAlert" | "reviewQueue" | "lowStock";
  title: string;
  severity: "high" | "medium" | "low";
}

/** 待点评处方 */
export interface PharmaReviewItem {
  reviewId: string;
  prescriptionId: string;
}

/** 低库存药品 */
export interface PharmaStockItem {
  drugCode: string;
  onHand: number;
  threshold: number;
}

/** 相互作用警报 */
export interface PharmaInteractionAlert {
  alertId: string;
  drugA: string;
  drugB: string;
  severity: "high" | "medium" | "low";
}

/**
 * 药师待办合并 V8（纯函数）：待点评处方/低库存/相互作用警报三类合并。
 *
 * @param queue 待点评处方
 * @param stock 低库存
 * @param alerts 相互作用警报
 * @returns 待办列表
 */
export function buildPharmaTodoV8(
  queue: PharmaReviewItem[],
  stock: PharmaStockItem[],
  alerts: PharmaInteractionAlert[],
): PharmaTodo[] {
  const fromQueue: PharmaTodo[] = queue.map((r) => ({
    id: r.reviewId,
    type: "reviewQueue",
    title: `点评处方 ${r.prescriptionId}`,
    severity: "medium",
  }));
  const fromStock: PharmaTodo[] = stock.map((s) => ({
    id: s.drugCode,
    type: "lowStock",
    title: `低库存 ${s.drugCode}（${s.onHand}/${s.threshold}）`,
    severity: s.onHand < s.threshold / 2 ? "high" : "low",
  }));
  const fromAlerts: PharmaTodo[] = alerts.map((a) => ({
    id: a.alertId,
    type: "interactionAlert",
    title: `相互作用 ${a.drugA}+${a.drugB}`,
    severity: a.severity,
  }));
  return [...fromQueue, ...fromStock, ...fromAlerts];
}

/**
 * 药师待办排序 V8（纯函数）：interactionAlert > reviewQueue > lowStock。
 *
 * @param todos 待办列表
 * @returns 排序后列表
 */
export function prioritizePharmaV8(todos: PharmaTodo[]): PharmaTodo[] {
  const score = (t: PharmaTodo["type"]) =>
    t === "interactionAlert" ? 0 : t === "reviewQueue" ? 1 : 2;
  return [...todos].sort((a, b) => score(a.type) - score(b.type));
}

/**
 * 药师摘要 V8（纯函数）：queueCount/stockCount/alertCount。
 *
 * @param queue 待点评
 * @param stock 低库存
 * @param alerts 相互作用警报
 * @returns 摘要
 */
export function buildPharmaDigestV8(
  queue: PharmaReviewItem[],
  stock: PharmaStockItem[],
  alerts: PharmaInteractionAlert[],
): { queueCount: number; stockCount: number; alertCount: number; highAlertCount: number } {
  return {
    queueCount: queue.length,
    stockCount: stock.length,
    alertCount: alerts.length,
    highAlertCount: alerts.filter((a) => a.severity === "high").length,
  };
}
