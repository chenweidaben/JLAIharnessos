/**
 * 健澜科技 jlmedaios - 住院费用清单视图类型（按类别汇总 + 明细列表）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 单个费用类别汇总。 */
export interface CategorySum {
  category: string;
  total: number;
  count: number;
}

/** 明细列表中的一行。 */
export interface BillDetailRow {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  department: string;
  status: string;
  createdAt: string;
}

/** 费用清单视图（GET /api/v1/bill?visitId=）。 */
export interface BillListView {
  visitId: string;
  /** true 表示当前为演示数据（该就诊无真实费用行）。 */
  demo: boolean;
  items: BillDetailRow[];
  categories: CategorySum[];
  total: number;
  itemCount: number;
}
