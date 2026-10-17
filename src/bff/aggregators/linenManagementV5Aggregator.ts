/**
 * 健澜科技 jlmedaios - 被服洗涤与织物管理 V5 纯函数（M279-A）
 *
 * planLinenWashV5 / trackLinenLossV5 / optimizeLinenStockV5 / buildLinenManagementV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 织物库存 */
export interface LinenItem {
  itemType: string;
  ward: string;
  stock: number;
  issued: number;
  washing: number;
  lost: number;
  parLevel: number;
}

/**
 * 洗涤计划 V5（纯函数）：库存低于par+在洗不足以覆盖即安排洗涤。
 *
 * @param usage 病区每日用量
 * @param par 常备量
 * @param stock 当前库存
 * @returns 建议洗涤量
 */
export function planLinenWashV5(usage: number, par: number, stock: number): { washNow: number; reason: string } {
  const gap = par - stock;
  if (gap <= 0) {
    return { washNow: 0, reason: "库存充足，无需洗涤" };
  }
  return { washNow: Math.max(gap, usage), reason: "库存低于常备量，安排补洗" };
}

/**
 * 损耗追踪 V5（纯函数）：损耗率=丢失/(发放+丢失)。
 *
 * @param items 织物列表
 * @returns 损耗率与告警
 */
export function trackLinenLossV5(items: LinenItem[]): { totalLost: number; lossRate: number; alertItems: string[] } {
  let totalLost = 0;
  let totalIssued = 0;
  const alertItems: string[] = [];
  for (const it of items) {
    totalLost += it.lost;
    totalIssued += it.issued;
    const rate = it.issued + it.lost > 0 ? it.lost / (it.issued + it.lost) : 0;
    if (rate > 0.05) alertItems.push(`${it.ward}-${it.itemType}`);
  }
  const lossRate = totalIssued + totalLost > 0
    ? Math.round((totalLost / (totalIssued + totalLost)) * 1000) / 10
    : 0;
  return { totalLost, lossRate, alertItems };
}

/**
 * 库存优化 V5（纯函数）：低于par触发补货建议。
 *
 * @param item 织物
 * @returns 库存建议
 */
export function optimizeLinenStockV5(item: LinenItem): { status: "healthy" | "low" | "critical"; suggestedReorder: number } {
  let status: "healthy" | "low" | "critical" = "healthy";
  let suggestedReorder = 0;
  if (item.stock <= item.parLevel * 0.5) {
    status = "critical";
    suggestedReorder = item.parLevel * 2;
  } else if (item.stock <= item.parLevel) {
    status = "low";
    suggestedReorder = Math.round(item.parLevel * 1.5);
  }
  return { status, suggestedReorder };
}

/** 被服报告输出 */
export interface LinenManagementV5Report {
  totalItems: number;
  totalLost: number;
  lossRate: number;
  lowStockCount: number;
  suggestions: string[];
}

/**
 * 构建被服管理报告（纯函数）。
 *
 * @param items 织物列表
 * @returns 报告
 */
export function buildLinenManagementV5Report(items: LinenItem[]): LinenManagementV5Report {
  const loss = trackLinenLossV5(items);
  const lowStockCount = items.filter((i) => optimizeLinenStockV5(i).status !== "healthy").length;
  return {
    totalItems: items.length,
    totalLost: loss.totalLost,
    lossRate: loss.lossRate,
    lowStockCount,
    suggestions: loss.alertItems.length > 0
      ? [`${loss.alertItems.length} 类织物损耗超5%，需排查`]
      : ["被服管理正常，按计划洗涤"],
  };
}
