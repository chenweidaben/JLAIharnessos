/**
 * 健澜科技 jlmedaios - 药品库存预警聚合器
 *
 * 对药房现有库存做低库存扫描：
 *  - lowStockAlert：纯函数、无 I/O、确定性；输入药品库存行 + 库存阈值，
 *    返回低于阈值的药品列表，并给出建议采购量（补货至 2 倍安全库存）。
 *  - listView：best-effort 从 inventoryRepo 装载真实库存并跑预警；
 *    查询失败或库表为空时安全降级为 demo 演示行（demo:true），绝不抛错、不臆造数据。
 *
 * 医疗安全定位：本模块为药库补货提醒，不触发自动采购、不替代药师盘点决策。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import * as inventoryRepo from '../../db/repositories/inventoryRepo.js';

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

/** 一条药品库存记录（纯数据，无 I/O） */
export interface DrugStockItem {
  id: string;
  /** 药品编码 */
  drugCode: string;
  /** 药品通用名 */
  drugName: string;
  /** 药房/库房 */
  warehouse: string;
  /** 批号（可空） */
  batchNo: string | null;
  /** 当前库存数量 */
  quantity: number;
  /** 计量单位 */
  unit: string;
  /** 效期（YYYY-MM-DD，可空） */
  expiryDate: string | null;
}

/** 低库存预警项：在库存行基础上附加阈值/缺口/建议采购量 */
export interface LowStockAlertItem extends DrugStockItem {
  /** 触发预警的库存阈值 */
  threshold: number;
  /** 缺口 = 阈值 - 当前库存 */
  shortfall: number;
  /** 建议采购量 = 2 * 阈值 - 当前库存（补货至两倍安全库存，覆盖一个补货周期） */
  suggestedPurchaseQty: number;
}

/** listView 返回的视图结构 */
export interface DrugInventoryView {
  /** 本次扫描使用的库存阈值 */
  threshold: number;
  /** 库存总行数 */
  total: number;
  /** 低库存预警行数 */
  lowCount: number;
  /** true 表示当前为演示数据（无真实库存/查询失败降级） */
  demo: boolean;
  /** 全部库存行 */
  items: DrugStockItem[];
  /** 低库存预警行（含建议采购量） */
  alerts: LowStockAlertItem[];
  scannedAt: string;
}

/** 默认库存阈值（单位：最小制剂单位） */
export const DEFAULT_STOCK_THRESHOLD = 100;

// ---------------------------------------------------------------------------
// 纯函数：低库存预警
// ---------------------------------------------------------------------------

/**
 * 低库存扫描：返回 quantity < threshold 的药品，并计算建议采购量。
 *
 * 规则（确定性、可单测）：
 *  - 仅保留 quantity 严格小于 threshold 的行；quantity === threshold 不预警；
 *  - shortfall = threshold - quantity；
 *  - suggestedPurchaseQty = 2 * threshold - quantity
 *    （补到两倍安全库存：一倍补足缺口、一倍覆盖在途/补货周期消耗）；
 *  - 非法输入（非数组、缺药名、数量非数）安全过滤/降级，不抛错。
 *
 * @param drugs     库存行数组
 * @param threshold 库存阈值；非正数按 DEFAULT_STOCK_THRESHOLD 处理
 */
export function lowStockAlert(
  drugs: DrugStockItem[],
  threshold: number,
): LowStockAlertItem[] {
  const t = Number.isFinite(threshold) && threshold > 0 ? Math.floor(threshold) : DEFAULT_STOCK_THRESHOLD;
  const list = (Array.isArray(drugs) ? drugs : []).filter(
    (d) =>
      d &&
      typeof d.drugName === 'string' &&
      d.drugName.trim().length > 0 &&
      Number.isFinite(d.quantity),
  );

  const alerts: LowStockAlertItem[] = [];
  for (const d of list) {
    const qty = Math.max(0, Math.floor(d.quantity));
    if (qty >= t) continue;
    alerts.push({
      ...d,
      quantity: qty,
      threshold: t,
      shortfall: t - qty,
      suggestedPurchaseQty: 2 * t - qty,
    });
  }
  // 缺口最大的排在最前（最紧急）
  return alerts.sort((a, b) => b.shortfall - a.shortfall);
}

// ---------------------------------------------------------------------------
// 演示数据（无真实库存时降级）
// ---------------------------------------------------------------------------

/** 演示库存行：覆盖低库存 / 正常库存 / 近效期几种情形 */
const DEMO_ITEMS: DrugStockItem[] = [
  { id: 'demo-1', drugCode: 'XB2023001', drugName: '注射用头孢曲松钠', warehouse: '中心药房', batchNo: 'B20260311', quantity: 32, unit: '支', expiryDate: '2027-03-31' },
  { id: 'demo-2', drugCode: 'XB2023002', drugName: '盐酸左氧氟沙星注射液', warehouse: '中心药房', batchNo: 'B20260502', quantity: 8, unit: '支', expiryDate: '2027-05-31' },
  { id: 'demo-3', drugCode: 'XB2023003', drugName: '0.9%氯化钠注射液', warehouse: '输液库', batchNo: 'B20260801', quantity: 1500, unit: '袋', expiryDate: '2027-08-31' },
  { id: 'demo-4', drugCode: 'XB2023004', drugName: '美罗培南注射剂', warehouse: '急诊药房', batchNo: 'B20260418', quantity: 45, unit: '支', expiryDate: '2026-04-30' },
  { id: 'demo-5', drugCode: 'XB2023005', drugName: '奥美拉唑肠溶胶囊', warehouse: '门诊药房', batchNo: 'B20260610', quantity: 260, unit: '盒', expiryDate: '2027-06-30' },
  { id: 'demo-6', drugCode: 'XB2023006', drugName: '人血白蛋白注射液', warehouse: '急诊药房', batchNo: 'B20260220', quantity: 5, unit: '瓶', expiryDate: '2027-02-28' },
];

// ---------------------------------------------------------------------------
// 视图入口
// ---------------------------------------------------------------------------

/** 把 inventoryRepo 的库存行归一化为 DrugStockItem */
function toStockItem(row: inventoryRepo.Inventory): DrugStockItem {
  return {
    id: row.id,
    drugCode: row.drugCode ?? '',
    drugName: row.genericName ?? '(未命名药品)',
    warehouse: row.warehouse,
    batchNo: row.batchNo,
    quantity: row.quantity,
    unit: row.unit,
    expiryDate: row.expiryDate,
  };
}

/**
 * 库存列表 + 低库存预警视图。
 *  - 真实库存：inventoryRepo.listInventory 装载后跑 lowStockAlert；
 *  - 库表为空 / 查询失败：安全降级为 demo:true 演示行，前端可据此展示"演示数据"徽标。
 *
 * @param threshold 可选阈值 query 覆盖；缺省 DEFAULT_STOCK_THRESHOLD
 */
export async function listView(threshold?: number): Promise<DrugInventoryView> {
  const t = Number.isFinite(threshold) && (threshold as number) > 0
    ? Math.floor(threshold as number)
    : DEFAULT_STOCK_THRESHOLD;

  let items: DrugStockItem[] = [];
  let demo = false;
  try {
    const rows = await inventoryRepo.listInventory({ limit: 300 });
    items = (rows ?? []).map(toStockItem);
  } catch {
    items = []; // 库存查询失败：按空表降级
  }
  if (items.length === 0) {
    items = DEMO_ITEMS;
    demo = true;
  }

  const alerts = lowStockAlert(items, t);
  return {
    threshold: t,
    total: items.length,
    lowCount: alerts.length,
    demo,
    items,
    alerts,
    scannedAt: new Date().toISOString(),
  };
}
