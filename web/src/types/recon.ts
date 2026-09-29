/**
 * 健澜科技 jlmedaios - 医保对账类型（M3-G）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type ReconStatus = 'draft' | 'confirmed' | 'disputed';

export interface ReconRun {
  id: string;
  runNo: string;
  periodLabel: string;
  status: ReconStatus;
  totalItems: number;
  matchedItems: number;
  discrepancyItems: number;
  totalPosted: string;
  totalExpected: string;
  createdAt: string;
  confirmedAt: string | null;
  note: string | null;
}

export interface ReconItem {
  id: string;
  itemCode: string | null;
  itemName: string | null;
  quantity: string;
  postedAmount: string;
  catalogPrice: string | null;
  expectedAmount: string;
  diff: string;
  matched: boolean;
  note: string | null;
}

export interface ReconRunDetail extends ReconRun {
  items: ReconItem[];
}
