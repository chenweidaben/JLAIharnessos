/**
 * 健澜科技 jlmedaios - DRG 费用超支预警 V13 纯函数（M313-A）
 *
 * computeDrgVarianceV13 / classifyDrgCaseV13 / aggregateDrgByDeptV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** DRG 病例 */
export interface DrgCaseV13 {
  caseId: string;
  dept: string;
  actualCost: number;
  drgStandard: number;
}

/** 科室汇总 */
export interface DeptDrgSummaryV13 {
  dept: string;
  cases: number;
  avgVariance: number;
  overrunCount: number;
  saveCount: number;
}

/**
 * 病例费用偏差（纯函数）：actualCost - drgStandard。
 *
 * @param caseItem 病例
 * @returns 偏差（正数超支/负数节省）
 */
export function computeDrgVarianceV13(caseItem: DrgCaseV13): number {
  return caseItem.actualCost - caseItem.drgStandard;
}

/**
 * 病例分类（纯函数）：>0 超支红 / <0 节省绿 / =0 持平蓝。
 *
 * @param variance 偏差
 * @returns 分类
 */
export function classifyDrgCaseV13(variance: number): string {
  if (variance > 0) return "超支";
  if (variance < 0) return "节省";
  return "持平";
}

/**
 * 按科室汇总（纯函数）：平均偏差、超支病例数、节省病例数。
 *
 * @param cases 病例列表
 * @returns 科室汇总
 */
export function aggregateDrgByDeptV13(cases: DrgCaseV13[]): DeptDrgSummaryV13[] {
  const map = new Map<string, { sum: number; overrun: number; save: number; count: number }>();
  for (const c of cases) {
    const v = computeDrgVarianceV13(c);
    const entry = map.get(c.dept) ?? { sum: 0, overrun: 0, save: 0, count: 0 };
    entry.sum += v;
    entry.count += 1;
    if (v > 0) entry.overrun += 1;
    if (v < 0) entry.save += 1;
    map.set(c.dept, entry);
  }
  return Array.from(map.entries()).map(([dept, e]) => ({
    dept,
    cases: e.count,
    avgVariance: Math.round(e.sum / e.count),
    overrunCount: e.overrun,
    saveCount: e.save,
  }));
}
