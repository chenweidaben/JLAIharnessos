/**
 * 健澜科技 jlmedaios - 月度结算报表纯函数（M23-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface CaseRow {
  selectedPath: string; // auto_drg | auto_dip | drg | dip | manual
  drgPayment: number;
  dipPayment: number;
  outOfPocket: number;
  dipScore?: number;
}

export interface Summary {
  drgCases: number; dipCases: number;
  totalScore: number; insuranceSettlement: number; outOfPocket: number;
}

function isDipPath(p: string): boolean {
  return p === 'auto_dip' || p === 'dip';
}
function isDrgPath(p: string): boolean {
  return p === 'auto_drg' || p === 'drg';
}

/** 聚合逐病例为月度汇总。 */
export function aggregateSummary(cases: CaseRow[], pointValue: number): Summary {
  let drgCases = 0, dipCases = 0, totalScore = 0, insuranceSettlement = 0, outOfPocket = 0;
  for (const c of cases) {
    if (isDipPath(c.selectedPath)) { dipCases++; insuranceSettlement += c.dipPayment; totalScore += c.dipScore ?? 0; }
    else if (isDrgPath(c.selectedPath)) { drgCases++; insuranceSettlement += c.drgPayment; }
    else {
      // manual：取较高者计
      insuranceSettlement += Math.max(c.drgPayment, c.dipPayment);
    }
    outOfPocket += c.outOfPocket;
  }
  return { drgCases, dipCases, totalScore, insuranceSettlement, outOfPocket };
}

/** 生成 CSV 文本（表头+一行汇总）。 */
export function toCsv(s: Summary & { period: string; pointValue: number }): string {
  const header = 'period,drg_cases,dip_cases,total_score,point_value,insurance_settlement,patient_out_of_pocket';
  const row = [s.period, s.drgCases, s.dipCases, s.totalScore, s.pointValue, s.insuranceSettlement, s.outOfPocket].join(',');
  return `${header}\n${row}\n`;
}
