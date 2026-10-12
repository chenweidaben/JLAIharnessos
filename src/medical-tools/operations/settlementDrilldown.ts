/**
 * 健澜科技 jlmedaios - 结算科室/医生维度下钻纯函数（M23-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface PeriodCase {
  department: string;
  doctorId: string;
  settlement: number;
  overspend: boolean;
  drugCost: number;
  totalCost: number;
}

export interface DrillRow {
  key: string;
  label: string;
  cases: number;
  settlementTotal: number;
  overspendRate: number;
  drugRatio: number;
}

function aggregate(cases: PeriodCase[], keyOf: (c: PeriodCase) => { key: string; label: string }): DrillRow[] {
  const m = new Map<string, { label: string; cases: number; settlementTotal: number; over: number; drug: number; total: number }>();
  for (const c of cases) {
    const { key, label } = keyOf(c);
    let row = m.get(key);
    if (!row) { row = { label, cases: 0, settlementTotal: 0, over: 0, drug: 0, total: 0 }; m.set(key, row); }
    row.cases += 1;
    row.settlementTotal += c.settlement;
    if (c.overspend) row.over += 1;
    row.drug += c.drugCost;
    row.total += c.totalCost;
  }
  const out: DrillRow[] = [];
  for (const [key, row] of m) {
    out.push({
      key, label: row.label, cases: row.cases, settlementTotal: row.settlementTotal,
      overspendRate: row.cases > 0 ? row.over / row.cases : 0,
      drugRatio: row.total > 0 ? row.drug / row.total : 0,
    });
  }
  out.sort((a, b) => b.settlementTotal - a.settlementTotal);
  return out;
}

/** 按科室聚合（降序）。 */
export function byDepartment(cases: PeriodCase[]): DrillRow[] {
  return aggregate(cases, (c) => ({ key: c.department, label: c.department }));
}

/** 按主治医师聚合（降序）。 */
export function byDoctor(cases: PeriodCase[]): DrillRow[] {
  return aggregate(cases, (c) => ({ key: c.doctorId, label: c.doctorId }));
}
