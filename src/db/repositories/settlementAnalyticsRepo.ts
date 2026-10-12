/**
 * 健澜科技 jlmedaios - 结算分析 repo（M23-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../pool.js';
import type { SummaryRow } from './settlementReportRepo.js';
import { listSummaries } from './settlementReportRepo.js';

const db = getDb();

export type { SummaryRow };

/** 取全部月度汇总（调用方在内存按 period 排序取近 N 期）。 */
export async function listAllSummaries(): Promise<SummaryRow[]> {
  return listSummaries();
}

/** 占位：费用类别占比由 aggregator 在内存按纯函数组装（本切片纯读汇总表）。 */
export async function categoryShares(_period: string): Promise<{ drugShare: number; materialShare: number; examShare: number }> {
  // 本切片不联 billing 类别表（避免跨模块破坏），返回 0 占位，前端展示结构趋势即可。
  return { drugShare: 0, materialShare: 0, examShare: 0 };
}
