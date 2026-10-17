/**
 * 健澜科技 jlmedaios - 耗材库存与供应预测 V3 纯函数（M277-C）
 *
 * forecastConsumptionV3 / reorderPointV3 / optimizeInventoryV3 / buildSupplyForecastV3Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 耗材 */
export interface SupplyItem {
  itemId: string;
  warehouse: string;
  stock: number;
  avgDailyUsage: number;
  safetyStock: number;
}

/**
 * 消耗预测 V3（纯函数）：日均用量×提前期×季节因子。
 *
 * @param avgDailyUsage 日均用量
 * @param leadTimeDays 提前期（天）
 * @returns 提前期内预计消耗
 */
export function forecastConsumptionV3(avgDailyUsage: number, leadTimeDays: number): number {
  return Math.round(avgDailyUsage * leadTimeDays * 1.1);
}

/**
 * 补货点 V3（纯函数）：提前期消耗+安全库存。
 *
 * @param avgDailyUsage 日均用量
 * @param leadTimeDays 提前期
 * @param safetyStock 安全库存
 * @returns 补货点
 */
export function reorderPointV3(avgDailyUsage: number, leadTimeDays: number, safetyStock: number): number {
  return forecastConsumptionV3(avgDailyUsage, leadTimeDays) + safetyStock;
}

/**
 * 库存优化 V3（纯函数）：库存低于补货点则建议订货。
 *
 * @param item 耗材
 * @param leadTimeDays 提前期
 * @returns 库存状态与建议订货量
 */
export function optimizeInventoryV3(item: SupplyItem, leadTimeDays: number): {
  reorderPoint: number;
  suggestedOrder: number;
  status: "healthy" | "low" | "critical";
} {
  const rp = reorderPointV3(item.avgDailyUsage, leadTimeDays, item.safetyStock);
  let status: "healthy" | "low" | "critical" = "healthy";
  let suggestedOrder = 0;
  if (item.stock <= rp * 0.5) {
    status = "critical";
    suggestedOrder = rp * 2;
  } else if (item.stock <= rp) {
    status = "low";
    suggestedOrder = Math.round(rp * 1.5);
  }
  return { reorderPoint: rp, suggestedOrder, status };
}

/** 供应预测报告输出 */
export interface SupplyForecastV3Report {
  totalItems: number;
  healthyCount: number;
  lowCount: number;
  criticalCount: number;
  totalSuggestedOrder: number;
  suggestions: string[];
}

/**
 * 构建供应预测报告（纯函数）。
 *
 * @param items 耗材列表
 * @param leadTimeDays 提前期
 * @returns 报告
 */
export function buildSupplyForecastV3Report(items: SupplyItem[], leadTimeDays: number): SupplyForecastV3Report {
  let healthyCount = 0;
  let lowCount = 0;
  let criticalCount = 0;
  let totalSuggestedOrder = 0;
  for (const item of items) {
    const opt = optimizeInventoryV3(item, leadTimeDays);
    if (opt.status === "healthy") healthyCount += 1;
    else if (opt.status === "low") lowCount += 1;
    else criticalCount += 1;
    totalSuggestedOrder += opt.suggestedOrder;
  }
  return {
    totalItems: items.length,
    healthyCount,
    lowCount,
    criticalCount,
    totalSuggestedOrder,
    suggestions: criticalCount > 0
      ? ["存在临界缺货项，立即触发紧急补货"]
      : ["库存健康，按建议批量补货"],
  };
}
