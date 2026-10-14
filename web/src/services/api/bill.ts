/**
 * 健澜科技 jlmedaios - 住院费用清单 API（按类别汇总 + 明细列表）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';
import type { BillListView } from '@/types/bill';

const base = '/bill';

export function fetchBill(visitId: string) {
  return get<BillListView>(`${base}`, { visitId });
}
