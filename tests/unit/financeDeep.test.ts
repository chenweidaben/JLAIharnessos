/**
 * 健澜科技 jlmedaios — 【财务人力行政党建】医院财务管理深化纯函数单测（M178-A）
 *
 * 覆盖：
 *   calculateDepartmentCost（直接/间接成本归集、项目成本下钻、单位成本、账期过滤）
 *   analyzeRevenueStructure（四类收入占比、药占比红线预警）
 *   predictFinancialTrend（月度净结余线性回归、上升/下降/平稳方向、外推 3 期）
 *   buildDeepFinanceMgmt（预算执行超支预警 + 本量利 CVP 固定/变动划分）。
 * 与持久化解耦，不触库，全部喂确定性数据集。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildDeepFinanceMgmt,
  calculateDepartmentCost,
  analyzeRevenueStructure,
  predictFinancialTrend,
  type BudgetLine,
  type DeepTxn,
  type MonthlyPoint,
} from '../../src/bff/aggregators/financeDeepAggregator';

/** 构造一笔默认内科/2026 年 6 月/直接成本的流水，方便用例覆盖差异字段 */
function txn(partial: Partial<DeepTxn> & Pick<DeepTxn, 'type' | 'category' | 'amount'>): DeepTxn {
  return {
    dept: 'im', periodYear: 2026, periodMonth: 6, costNature: 'direct',
    ...partial,
  };
}

describe('calculateDepartmentCost（科室成本核算，账实相符）', () => {
  it('直接/间接成本归集，合计=直接+间接；项目成本下钻；单位成本按人次/床日折算', () => {
    const rows: DeepTxn[] = [
      txn({ type: 'expense', category: 'salary', amount: 100000 }),                 // 直接
      txn({ type: 'expense', category: 'consumable_purchase', amount: 30000 }),     // 直接
      txn({ type: 'expense', category: 'utilities', amount: 20000, costNature: 'indirect' }), // 间接
      txn({ type: 'expense', category: 'drug_purchase', amount: 50000, projectCode: 'P001' }), // 直接+项目
      txn({ type: 'income', category: 'outpatient', amount: 300000 }),
    ];
    const r = calculateDepartmentCost('im', { year: 2026, month: 6 }, rows, {
      outpatientVisits: 1000, bedDays: 500,
    });
    expect(r.directCost).toBe(180000);   // 100000 + 30000 + 50000
    expect(r.indirectCost).toBe(20000);
    expect(r.totalCost).toBe(200000);
    expect(r.deptRevenue).toBe(300000);
    expect(r.netContribution).toBe(100000);
    expect(r.projectCosts.find((p) => p.projectCode === 'P001')?.directCost).toBe(50000);
    expect(r.costPerVisit).toBe(200);    // 200000 / 1000 人次
    expect(r.costPerBedDay).toBe(400);   // 200000 / 500 床日
  });

  it('账期过滤：5 月的流水不计入 6 月成本，防止跨期串账', () => {
    const rows: DeepTxn[] = [
      txn({ type: 'expense', category: 'salary', amount: 100000 }),
      txn({ type: 'expense', category: 'salary', amount: 99999, periodMonth: 5 }), // 跨月，应排除
    ];
    const r = calculateDepartmentCost('im', { year: 2026, month: 6 }, rows);
    expect(r.totalCost).toBe(100000);
  });
});

describe('analyzeRevenueStructure（收入结构与药占比预警）', () => {
  it('四类收入占比合计=1，药占比超 30% 触发红线预警', () => {
    const rows: DeepTxn[] = [
      txn({ type: 'income', category: 'outpatient', amount: 600000 }),
      txn({ type: 'income', category: 'inpatient', amount: 800000 }),
      txn({ type: 'income', category: 'drug', amount: 900000 }),
      txn({ type: 'income', category: 'exam', amount: 100000 }),
    ];
    const s = analyzeRevenueStructure({ year: 2026, month: 6 }, rows);
    expect(s.totalRevenue).toBe(2400000);
    expect(s.drugRatio).toBeCloseTo(0.375, 3);   // 900000/2400000
    expect(s.drugRatioWarning).toBe(true);
    expect(s.byCategory.reduce((a, c) => a + c.share, 0)).toBeCloseTo(1, 3);
  });

  it('药占比低于 30% 不预警', () => {
    const rows: DeepTxn[] = [
      txn({ type: 'income', category: 'outpatient', amount: 600000 }),
      txn({ type: 'income', category: 'drug', amount: 150000 }), // 150000/750000=0.2
    ];
    const s = analyzeRevenueStructure({ year: 2026, month: 6 }, rows);
    expect(s.drugRatioWarning).toBe(false);
  });
});

describe('predictFinancialTrend（月度净结余线性外推）', () => {
  it('净结余逐月上升 → direction=up，斜率为正，外推 3 期继续走高', () => {
    const series: MonthlyPoint[] = [
      { year: 2026, month: 3, income: 200000, expense: 100000 }, // 净 100000
      { year: 2026, month: 4, income: 220000, expense: 100000 }, // 净 120000
      { year: 2026, month: 5, income: 240000, expense: 100000 }, // 净 140000
      { year: 2026, month: 6, income: 260000, expense: 100000 }, // 净 160000
    ];
    const t = predictFinancialTrend({ year: 2026, month: 6 }, series);
    expect(t.direction).toBe('up');
    expect(t.slope).toBeGreaterThan(0);
    expect(t.forecastNet).toHaveLength(3);
    expect(t.forecastNet[2].net).toBeGreaterThan(t.forecastNet[0].net);
  });

  it('净结余逐月下降 → direction=down', () => {
    const series: MonthlyPoint[] = [
      { year: 2026, month: 3, income: 260000, expense: 100000 },
      { year: 2026, month: 4, income: 240000, expense: 100000 },
      { year: 2026, month: 5, income: 220000, expense: 100000 },
      { year: 2026, month: 6, income: 200000, expense: 100000 },
    ];
    const t = predictFinancialTrend({ year: 2026, month: 6 }, series);
    expect(t.direction).toBe('down');
    expect(t.slope).toBeLessThan(0);
  });

  it('样本不足 2 期 → 平稳，不外推', () => {
    const t = predictFinancialTrend({ year: 2026, month: 6 }, []);
    expect(t.direction).toBe('flat');
    expect(t.forecastNet).toHaveLength(0);
  });
});

describe('buildDeepFinanceMgmt（预算超支预警 + 本量利 CVP）', () => {
  const budgets: BudgetLine[] = [
    { dept: 'im', fiscalYear: 2026, subject: 'salary', annualAmount: 600000 },
    { dept: 'im', fiscalYear: 2026, subject: 'consumable_purchase', annualAmount: 240000 },
  ];
  const rows: DeepTxn[] = [
    // 工资累计 30 万 = 进度基准 30 万 → on_track
    txn({ type: 'expense', category: 'salary', amount: 300000 }),
    // 耗材累计 15 万，进度基准仅 12 万 → paceRate 1.25 → over
    txn({ type: 'expense', category: 'consumable_purchase', amount: 150000 }),
    txn({ type: 'expense', category: 'utilities', amount: 30000 }),
    txn({ type: 'income', category: 'outpatient', amount: 800000 }),
  ];

  it('耗材超进度 25% 判 over，超支预警计数≥1', () => {
    const m = buildDeepFinanceMgmt({ period: { year: 2026, month: 6 }, txns: rows, budgets });
    const cons = m.budgetExecution.find((l) => l.subject === 'consumable_purchase')!;
    expect(cons.status).toBe('over');
    expect(m.overrunAlertCount).toBeGreaterThan(0);
  });

  it('CVP：固定成本=工资+水电，变动成本=耗材，边际贡献=收入-变动成本', () => {
    const m = buildDeepFinanceMgmt({ period: { year: 2026, month: 6 }, txns: rows, budgets });
    expect(m.cvp.fixedCost).toBe(330000);     // 300000 + 30000
    expect(m.cvp.variableCost).toBe(150000); // consumable_purchase
    expect(m.cvp.revenue).toBe(800000);
    expect(m.cvp.contributionMargin).toBe(650000);
    expect(m.cvp.breakEvenRevenue).toBeGreaterThan(0);
  });
});
