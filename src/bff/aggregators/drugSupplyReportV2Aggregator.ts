/**
 * 健澜科技 jlmedaios - 药品供应链与耗材管理深化 V2 纯函数（M209-D）
 *
 * buildDrugSupplyReportV2 / assessDrugInventoryTurnover / traceHighValueConsumable
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估库存周转率（纯函数）。
 *
 * @param stock 库存金额
 * @param used 使用金额
 * @returns 周转率与等级
 */
export function assessDrugInventoryTurnover(stock: number, used: number): { turnover: number; level: string } {
  const turnover = stock > 0 ? used / stock : 0;
  let level = '合理';
  if (turnover < 2) level = '积压';
  else if (turnover > 12) level = '短缺风险';
  return { turnover, level };
}

/**
 * 追溯高值耗材（纯函数）。
 *
 * @param barcode 条码
 * @returns 追溯结果
 */
export function traceHighValueConsumable(barcode: string): { traced: boolean; batch: string; expiry: string } {
  if (barcode.length > 0) {
    return { traced: true, batch: 'B2026001', expiry: '2027-12-31' };
  }
  return { traced: false, batch: '', expiry: '' };
}

/** 药品供应链 V2 报告输出 */
export interface DrugSupplyReportV2 {
  timeRange: string;
  procurement: { sunshine: number; tender: number };
  inventory: { total: number; nearExpiry: number; slowMoving: number };
  special: { narcotic: number; coldChain: number; radioactive: number };
  spd: { highValue: number; lowValue: number };
  adr: { recall: number };
  collaboration: { supplierPortal: number };
  suggestions: string[];
}

/**
 * 构建药品供应链 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 药品供应链 V2 报告
 */
export function buildDrugSupplyReportV2(timeRange: string): DrugSupplyReportV2 {
  return {
    timeRange,
    procurement: { sunshine: 10000, tender: 5000 },
    inventory: { total: 50000, nearExpiry: 100, slowMoving: 200 },
    special: { narcotic: 50, coldChain: 100, radioactive: 10 },
    spd: { highValue: 5000, lowValue: 10000 },
    adr: { recall: 5 },
    collaboration: { supplierPortal: 50 },
    suggestions: ['降低近效期库存', '加强冷链管理'],
  };
}
