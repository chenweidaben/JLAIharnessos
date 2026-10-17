/**
 * 健澜科技 jlmedaios - 患者投诉处理 V13 纯函数（M326-B）
 *
 * countMonthlyComplaintsV13 / computeTimelinessRateV13 / classifyComplaintByTypeV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 投诉记录 */
export interface ComplaintRecordV13 {
  type: "attitude" | "process" | "fee" | "quality";
  isTimely: boolean;
}

/** 类型分组项 */
export interface ComplaintTypeItemV13 {
  type: string;
  count: number;
}

/**
 * 本月投诉总数（纯函数）：总数。
 *
 * @param complaints 投诉记录列表
 * @returns 投诉总数
 */
export function countMonthlyComplaintsV13(complaints: ComplaintRecordV13[]): number {
  return complaints.length;
}

/**
 * 处理及时率（纯函数）：24h 内处理数/总投诉×100。
 *
 * @param complaints 投诉记录列表
 * @returns 及时率百分比
 */
export function computeTimelinessRateV13(complaints: ComplaintRecordV13[]): number {
  if (complaints.length === 0) return 0;
  const timely = complaints.filter((c) => c.isTimely).length;
  return Math.round((timely / complaints.length) * 100);
}

/**
 * 按类型分组（纯函数）：服务态度/就诊流程/费用问题/医疗质量 分组计数。
 *
 * @param complaints 投诉记录列表
 * @returns 类型分组列表
 */
export function classifyComplaintByTypeV13(complaints: ComplaintRecordV13[]): ComplaintTypeItemV13[] {
  const map = new Map<string, number>();
  for (const c of complaints) {
    map.set(c.type, (map.get(c.type) ?? 0) + 1);
  }
  return [...map.entries()].map(([type, count]) => ({ type, count }));
}
