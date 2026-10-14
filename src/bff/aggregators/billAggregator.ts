/**
 * 健澜科技 jlmedaios - 住院费用清单聚合器（按类别汇总 + 明细列表）
 *
 * 输入某次住院就诊（visitId）的费用明细行：
 *  - groupByCategory：纯函数，按费用类别分组并汇总金额（便于单测与复用）；
 *  - listView：从 fee_items 读取明细，剔除作废/退费行，输出「类别汇总 + 明细列表」；
 *    当该就诊无任何有效费用行时，返回 demo=true 的演示行，便于前端空态演示。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { listFeeItemsByVisit, type FeeCategory } from '../../db/repositories/billingRepo.js';

/* ------------------------------ 纯函数分组 ------------------------------ */

/** 分组输入：一行费用的类别与金额（元）。 */
export interface BillFeeLine {
  category: string;
  amount: number;
}

/** 单个费用类别的汇总结果。 */
export interface CategorySum {
  category: string;
  /** 该类别合计金额（元，保留两位小数）。 */
  total: number;
  /** 该类别明细行数。 */
  count: number;
}

/** 金额四舍五入到分（两位小数），避免浮点累加误差。 */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * 纯函数：按费用类别分组汇总金额。
 *
 * - 同类别金额累加，count 计数；
 * - 结果按合计金额从大到小排序（金额相同则按类别名升序，保证稳定）；
 * - 空入参返回空数组。
 */
export function groupByCategory(items: BillFeeLine[]): CategorySum[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const it of items) {
    const category = String(it?.category ?? 'other') || 'other';
    const amount = Number(it?.amount);
    const safe = Number.isFinite(amount) ? amount : 0;
    const cur = map.get(category) ?? { total: 0, count: 0 };
    cur.total += safe;
    cur.count += 1;
    map.set(category, cur);
  }
  return Array.from(map.entries())
    .map(([category, v]) => ({ category, total: round2(v.total), count: v.count }))
    .sort((a, b) => (b.total === a.total ? a.category.localeCompare(b.category) : b.total - a.total));
}

/* ------------------------------ 视图组装 ------------------------------ */

/** 明细列表中的一行（前端表格渲染用）。 */
export interface BillDetailRow {
  id: string;
  itemName: string;
  category: FeeCategory | string;
  quantity: number;
  unitPrice: number;
  amount: number;
  department: string;
  status: string;
  createdAt: string;
}

/** listView 返回的清单视图。 */
export interface BillListView {
  visitId: string;
  /** true 表示当前为演示数据（该就诊无真实费用行）。 */
  demo: boolean;
  items: BillDetailRow[];
  categories: CategorySum[];
  /** 全部有效费用合计（元）。 */
  total: number;
  itemCount: number;
}

/** 作废 / 退费行不计入清单。 */
const EXCLUDED_STATUS = new Set(['void', 'refunded']);

function toRow(input: {
  id: string;
  itemName: string;
  category: FeeCategory | string;
  quantity: string;
  unitPrice: string;
  amount: string;
  department: string;
  status: string;
  createdAt: string;
}): BillDetailRow {
  return {
    id: input.id,
    itemName: input.itemName,
    category: input.category,
    quantity: Number(input.quantity) || 0,
    unitPrice: round2(Number(input.unitPrice) || 0),
    amount: round2(Number(input.amount) || 0),
    department: input.department,
    status: input.status,
    createdAt: input.createdAt,
  };
}

/** 无数据时的演示行（demo=true）。 */
function demoRows(): BillDetailRow[] {
  const now = new Date().toISOString();
  return [
    toRow({ id: 'demo-bed', itemName: '床位费（三人间/天）', category: 'bed', quantity: '10', unitPrice: '60.00', amount: '600.00', department: '一病区', status: 'active', createdAt: now }),
    toRow({ id: 'demo-nursing', itemName: '分级护理（二级护理/天）', category: 'nursing', quantity: '10', unitPrice: '32.05', amount: '320.50', department: '一病区', status: 'active', createdAt: now }),
    toRow({ id: 'demo-ct', itemName: '胸部 CT 平扫', category: 'imaging', quantity: '1', unitPrice: '280.00', amount: '280.00', department: '放射科', status: 'settled', createdAt: now }),
    toRow({ id: 'demo-drug', itemName: '阿莫西林胶囊 0.25g×24', category: 'drug', quantity: '3', unitPrice: '28.80', amount: '86.40', department: '药房', status: 'active', createdAt: now }),
    toRow({ id: 'demo-lab', itemName: '血常规（五分类）', category: 'lab', quantity: '1', unitPrice: '25.00', amount: '25.00', department: '检验科', status: 'settled', createdAt: now }),
    toRow({ id: 'demo-material', itemName: '一次性输液器', category: 'material', quantity: '2', unitPrice: '22.50', amount: '45.00', department: '输液室', status: 'active', createdAt: now }),
  ];
}

/**
 * 住院费用清单视图：明细列表 + 类别汇总。
 * @param visitId 住院就诊 ID。
 *
 * 无有效费用行（新入院 / 未产生计费）时返回 demo=true 的演示行，
 * 前端据此给出「演示数据」提示而非空白页。
 */
export async function listView(visitId: string): Promise<BillListView> {
  const trimmed = visitId.trim();
  const feeLines = await listFeeItemsByVisit(trimmed);
  const active = feeLines.filter((f) => !EXCLUDED_STATUS.has(f.status));

  if (active.length === 0) {
    const items = demoRows();
    return {
      visitId: trimmed,
      demo: true,
      items,
      categories: groupByCategory(items.map((i) => ({ category: i.category, amount: i.amount }))),
      total: round2(items.reduce((s, i) => s + i.amount, 0)),
      itemCount: items.length,
    };
  }

  const items = active.map((f) =>
    toRow({
      id: f.id,
      itemName: f.itemName,
      category: f.category,
      quantity: f.quantity,
      unitPrice: f.unitPrice,
      amount: f.amount,
      department: f.department,
      status: f.status,
      createdAt: f.createdAt,
    }),
  );
  return {
    visitId: trimmed,
    demo: false,
    items,
    categories: groupByCategory(items.map((i) => ({ category: i.category, amount: i.amount }))),
    total: round2(items.reduce((s, i) => s + i.amount, 0)),
    itemCount: items.length,
  };
}
