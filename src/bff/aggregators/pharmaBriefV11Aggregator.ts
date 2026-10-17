/**
 * 健澜科技 jlmedaios - PHARMA_MUSE 主动式晨会简报 V11 纯函数（M293-C）
 *
 * buildPharmaBriefV11 / prioritizePharmaBriefV11 / formatPharmaBriefV11
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 晨会条目 */
export interface PharmaBriefItemV11 {
  id: string;
  category: "interactionAlert" | "reviewQueue" | "lowStock" | "intercept" | "weightDelta";
  title: string;
  priority: number;
}

export interface ReviewItemV11 {
  reviewId: string;
  prescriptionId: string;
}

export interface LowStockV11 {
  drugCode: string;
  onHand: number;
  threshold: number;
}

export interface InteractionAlertV11 {
  alertId: string;
  drugA: string;
  drugB: string;
}

export interface InterceptV11 {
  ruleId: string;
  count: number;
}

export interface PharmaWeightDeltaV11 {
  ruleId: string;
  delta: number;
}

/** 晨会简报 */
export interface PharmaBriefV11 {
  pharmacistId: string;
  items: PharmaBriefItemV11[];
  reviewCount: number;
  lowStockCount: number;
  interactionAlertCount: number;
  interceptTotal: number;
  weightDeltaCount: number;
}

const PRIORITY_MAP: Record<PharmaBriefItemV11["category"], number> = {
  interactionAlert: 1,
  reviewQueue: 2,
  lowStock: 3,
  intercept: 4,
  weightDelta: 5,
};

/**
 * 晨会简报聚合 V11（纯函数）：合并五类输入为统一条目。
 *
 * @param pharmacistId 药师ID
 * @param reviewQueue 待点评处方
 * @param lowStock 低库存
 * @param interactionAlerts 相互作用警报
 * @param intercepts 昨日拦截统计
 * @param weightDeltas 权重变化
 * @returns 简报
 */
export function buildPharmaBriefV11(
  pharmacistId: string,
  reviewQueue: ReviewItemV11[],
  lowStock: LowStockV11[],
  interactionAlerts: InteractionAlertV11[],
  intercepts: InterceptV11[],
  weightDeltas: PharmaWeightDeltaV11[],
): PharmaBriefV11 {
  const items: PharmaBriefItemV11[] = [
    ...interactionAlerts.map((a): PharmaBriefItemV11 => ({
      id: a.alertId,
      category: "interactionAlert",
      title: `相互作用 ${a.drugA}+${a.drugB}`,
      priority: PRIORITY_MAP.interactionAlert,
    })),
    ...reviewQueue.map((r): PharmaBriefItemV11 => ({
      id: r.reviewId,
      category: "reviewQueue",
      title: `点评处方 ${r.prescriptionId}`,
      priority: PRIORITY_MAP.reviewQueue,
    })),
    ...lowStock.map((s): PharmaBriefItemV11 => ({
      id: s.drugCode,
      category: "lowStock",
      title: `低库存 ${s.drugCode}（${s.onHand}/${s.threshold}）`,
      priority: PRIORITY_MAP.lowStock,
    })),
    ...intercepts.map((i): PharmaBriefItemV11 => ({
      id: i.ruleId,
      category: "intercept",
      title: `规则${i.ruleId}昨日拦截${i.count}次`,
      priority: PRIORITY_MAP.intercept,
    })),
    ...weightDeltas.map((w): PharmaBriefItemV11 => ({
      id: w.ruleId,
      category: "weightDelta",
      title: `规则${w.ruleId}权重${w.delta > 0 ? "+" : ""}${w.delta.toFixed(2)}`,
      priority: PRIORITY_MAP.weightDelta,
    })),
  ];
  return {
    pharmacistId,
    items,
    reviewCount: reviewQueue.length,
    lowStockCount: lowStock.length,
    interactionAlertCount: interactionAlerts.length,
    interceptTotal: intercepts.reduce((s, x) => s + x.count, 0),
    weightDeltaCount: weightDeltas.length,
  };
}

/**
 * 晨会排序 V11（纯函数）：interactionAlert > reviewQueue > lowStock > intercept > weightDelta。
 *
 * @param items 条目列表
 * @returns 排序后条目
 */
export function prioritizePharmaBriefV11(items: PharmaBriefItemV11[]): PharmaBriefItemV11[] {
  return [...items].sort((a, b) => a.priority - b.priority);
}

/**
 * 人话晨会 V11（纯函数）：含关键数字。
 *
 * @param brief 简报
 * @returns 文本
 */
export function formatPharmaBriefV11(brief: PharmaBriefV11): string {
  return (
    `早上好，${brief.pharmacistId}。今日${brief.interactionAlertCount}条相互作用警报，` +
    `${brief.reviewCount}张处方待点评，${brief.lowStockCount}个药品低库存，` +
    `昨日共拦截${brief.interceptTotal}次，另有${brief.weightDeltaCount}条规则权重变化。`
  );
}
