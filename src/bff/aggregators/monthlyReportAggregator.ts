/**
 * 健澜科技 jlmedaios - 科室月度运营报表聚合器
 *
 * buildMonthlyReport 为纯函数：汇总门诊/住院量、DRG 盈亏、质控得分、抗菌药物使用率，
 * 派生总量、质控等级、盈亏方向、抗菌药达标状态，并给出指标行用于前端表格。
 * generateView(month) 返回演示数据（demo:true），不访问数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 报表输入：五项运营指标 */
export interface MonthlyReportInput {
  /** 门诊量（人次） */
  outpatientCount: number;
  /** 住院量（人次） */
  inpatientCount: number;
  /** DRG 盈亏（元）：正为盈余，负为超支 */
  drgProfitLoss: number;
  /** 质控得分（0-100） */
  qcScore: number;
  /** 抗菌药物使用率（%） */
  antibioticUse: number;
}

/** 指标行状态 */
export type ReportStatus = 'good' | 'warn' | 'bad';

/** 指标行（前端表格用） */
export interface MonthlyReportRow {
  indicator: string;
  value: string;
  target: string;
  status: ReportStatus;
}

/** 汇总报告 */
export interface MonthlyReport {
  kpi: {
    outpatientCount: number;
    inpatientCount: number;
    /** 门急诊+住院总量 */
    totalVolume: number;
    drgProfitLoss: number;
    drgStatus: 'profit' | 'loss' | 'balanced';
    qcScore: number;
    qcGrade: 'A' | 'B' | 'C' | 'D';
    antibioticUse: number;
    antibioticCompliant: boolean;
  };
  summary: MonthlyReportRow[];
}

/** 演示视图（带月份与 demo 标记） */
export interface MonthlyReportView extends MonthlyReport {
  month: string;
  demo: boolean;
}

/** 质控等级：A>=90，B>=80，C>=70，其余 D */
export function qcGrade(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  return 'D';
}

/** DRG 盈亏方向 */
export function drgStatus(pnl: number): 'profit' | 'loss' | 'balanced' {
  if (pnl > 0) return 'profit';
  if (pnl < 0) return 'loss';
  return 'balanced';
}

/** 抗菌药物使用率达标阈值（%） */
export const ANTIBIOTIC_TARGET_PCT = 60;

function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return n.toFixed(0);
}

/**
 * 纯函数：汇总五项指标为月度运营报告。
 * 不做任何 IO，便于单测。
 */
export function buildMonthlyReport(input: MonthlyReportInput): MonthlyReport {
  const { outpatientCount, inpatientCount, drgProfitLoss, qcScore, antibioticUse } = input;

  const totalVolume = outpatientCount + inpatientCount;
  const grade = qcGrade(qcScore);
  const pnlStatus = drgStatus(drgProfitLoss);
  const antibioticCompliant = antibioticUse <= ANTIBIOTIC_TARGET_PCT;

  const qcStatus: ReportStatus = qcScore >= 90 ? 'good' : qcScore >= 70 ? 'warn' : 'bad';
  const pnlRowStatus: ReportStatus = pnlStatus === 'profit' ? 'good' : pnlStatus === 'balanced' ? 'warn' : 'bad';

  const summary: MonthlyReportRow[] = [
    {
      indicator: '门诊量',
      value: `${outpatientCount} 人次`,
      target: '-',
      status: 'good',
    },
    {
      indicator: '住院量',
      value: `${inpatientCount} 人次`,
      target: '-',
      status: 'good',
    },
    {
      indicator: '门住院总量',
      value: `${totalVolume} 人次`,
      target: '-',
      status: 'good',
    },
    {
      indicator: 'DRG 盈亏',
      value: `${pnlStatus === 'profit' ? '+' : pnlStatus === 'loss' ? '-' : ''}${fmtMoney(Math.abs(drgProfitLoss))} 元`,
      target: '>= 0',
      status: pnlRowStatus,
    },
    {
      indicator: '质控得分',
      value: `${qcScore} 分（${grade}）`,
      target: '>= 90',
      status: qcStatus,
    },
    {
      indicator: '抗菌药物使用率',
      value: `${antibioticUse}%`,
      target: `<= ${ANTIBIOTIC_TARGET_PCT}%`,
      status: antibioticCompliant ? 'good' : 'bad',
    },
  ];

  return {
    kpi: {
      outpatientCount,
      inpatientCount,
      totalVolume,
      drgProfitLoss,
      drgStatus: pnlStatus,
      qcScore,
      qcGrade: grade,
      antibioticUse,
      antibioticCompliant,
    },
    summary,
  };
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * 演示视图：按月份生成确定性演示数据（demo:true）。
 * 未接数据库前供前端预览使用；同一 month 返回稳定数据。
 */
export function generateView(month: string): MonthlyReportView {
  const safeMonth = MONTH_RE.test(month) ? month : currentMonth();
  // 由月份派生稳定演示数据（0-11）
  const slot = Number(safeMonth.slice(5, 7)) - 1;
  const outpatientCount = 8200 + (slot % 3) * 350;
  const inpatientCount = 1150 + (slot % 4) * 60;
  const drgProfitLoss = [32000, -18500, 0, 56000][slot % 4];
  const qcScore = [92, 85, 78, 95, 68][slot % 5];
  const antibioticUse = [42, 58, 63, 51, 66][slot % 5];

  return {
    ...buildMonthlyReport({ outpatientCount, inpatientCount, drgProfitLoss, qcScore, antibioticUse }),
    month: safeMonth,
    demo: true,
  };
}

/** 当月 YYYY-MM */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
