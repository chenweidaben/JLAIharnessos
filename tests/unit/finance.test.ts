/**
 * 健澜科技 jlmedaios - 医院财务管理纯函数单测（M139-D · 医院运营管理）
 *
 * 覆盖：
 *   - recordTransaction：收支登记、方向/类别匹配、金额为正、科室必填、两位小数；
 *   - buildFinanceReport：账期过滤、收入/支出合计、净额、分类汇总；
 *   - 科室分摊：按科室汇总收入/支出/净贡献并排序。
 *
 * 与持久化解耦：不触库（persistTransaction 由路由层显式调用，单测不覆盖）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it } from 'bun:test';
import {
  buildFinanceReport,
  recordTransaction,
  resetFinanceLedger,
} from '../../src/bff/aggregators/financeAggregator';

beforeEach(() => resetFinanceLedger());

describe('recordTransaction 收支记录', () => {
  it('登记一笔收入：方向/类别/标签/金额正确，金额按正数入账', () => {
    const txn = recordTransaction('income', 'outpatient', 1280.5, '内科', '门诊挂号费', {
      recordedAt: '2026-10-10T09:00:00.000Z',
    });
    expect(txn.id).toBeTruthy();
    expect(txn.type).toBe('income');
    expect(txn.category).toBe('outpatient');
    expect(txn.categoryLabel).toBe('门诊收入');
    expect(txn.amount).toBe(1280.5);
    expect(txn.dept).toBe('内科');
    expect(txn.description).toBe('门诊挂号费');
  });

  it('登记一笔支出：类别标签为支出口径', () => {
    const txn = recordTransaction('expense', 'salary', 80000, '全院', '十月工资', {
      recordedAt: '2026-10-10T09:00:00.000Z',
    });
    expect(txn.type).toBe('expense');
    expect(txn.categoryLabel).toBe('人员工资');
  });

  it('金额保留两位小数（消除浮点误差）', () => {
    const txn = recordTransaction('expense', 'utilities', 100.005, '全院', '电费', {
      recordedAt: '2026-10-10T09:00:00.000Z',
    });
    expect(txn.amount).toBe(100.01);
  });

  it('非法入参抛错：方向错误 / 类别与方向不匹配 / 金额非正 / 科室为空', () => {
    expect(() => recordTransaction('bad' as 'income', 'outpatient', 100, '内科', '')).toThrow();
    // outpatient 是收入类，不能作为支出登记
    expect(() => recordTransaction('expense', 'outpatient', 100, '内科', '')).toThrow();
    // salary 是支出类，不能作为收入登记
    expect(() => recordTransaction('income', 'salary', 100, '内科', '')).toThrow();
    expect(() => recordTransaction('income', 'drug', -5, '内科', '')).toThrow();
    expect(() => recordTransaction('income', 'drug', 0, '内科', '')).toThrow();
    expect(() => recordTransaction('income', 'drug', 100, '  ', '')).toThrow();
    expect(() => recordTransaction('income', 'not_exist', 100, '内科', '')).toThrow();
  });
});

describe('buildFinanceReport 报表生成', () => {
  it('汇总收入/支出合计与净结余，按类别分组', () => {
    recordTransaction('income', 'outpatient', 1000, '内科', '', { recordedAt: '2026-10-10T09:00:00Z' });
    recordTransaction('income', 'inpatient', 3000, '外科', '', { recordedAt: '2026-10-11T09:00:00Z' });
    recordTransaction('income', 'outpatient', 500, '内科', '', { recordedAt: '2026-10-12T09:00:00Z' });
    recordTransaction('expense', 'salary', 2000, '全院', '', { recordedAt: '2026-10-12T09:00:00Z' });
    recordTransaction('expense', 'drug_purchase', 800, '药房', '', { recordedAt: '2026-10-12T09:00:00Z' });

    const report = buildFinanceReport('2026-10-01', '2026-10-31');
    expect(report.totalIncome).toBe(4500);
    expect(report.totalExpense).toBe(2800);
    expect(report.netProfit).toBe(1700);
    expect(report.transactionCount).toBe(5);

    // 收入分类：门诊合计 1500、住院 3000，按金额降序
    expect(report.incomeByCategory).toHaveLength(2);
    expect(report.incomeByCategory[0].category).toBe('inpatient');
    expect(report.incomeByCategory[0].amount).toBe(3000);
    const outpatient = report.incomeByCategory.find((c) => c.category === 'outpatient');
    expect(outpatient?.amount).toBe(1500);
    expect(outpatient?.count).toBe(2);

    // 支出分类：钱花在哪一眼看清
    expect(report.expenseByCategory).toHaveLength(2);
    expect(report.expenseByCategory[0].category).toBe('salary');
  });

  it('账期外流水被过滤；起始晚于结束抛错', () => {
    recordTransaction('income', 'outpatient', 1000, '内科', '', { recordedAt: '2026-09-20T09:00:00Z' });
    recordTransaction('income', 'outpatient', 2000, '内科', '', { recordedAt: '2026-10-15T09:00:00Z' });

    const report = buildFinanceReport('2026-10-01', '2026-10-31');
    expect(report.totalIncome).toBe(2000);
    expect(report.transactionCount).toBe(1);

    expect(() => buildFinanceReport('2026-10-31', '2026-10-01')).toThrow();
    expect(() => buildFinanceReport('not-a-date', '2026-10-31')).toThrow();
  });
});

describe('科室分摊', () => {
  it('按科室汇总收入/支出/净贡献，按净额降序', () => {
    recordTransaction('income', 'outpatient', 5000, '内科', '', { recordedAt: '2026-10-10T09:00:00Z' });
    recordTransaction('expense', 'salary', 3000, '内科', '', { recordedAt: '2026-10-10T09:00:00Z' });
    recordTransaction('income', 'inpatient', 2000, '外科', '', { recordedAt: '2026-10-11T09:00:00Z' });
    recordTransaction('expense', 'equipment_purchase', 4000, '外科', '', { recordedAt: '2026-10-11T09:00:00Z' });

    const report = buildFinanceReport('2026-10-01', '2026-10-31');
    expect(report.deptAllocations).toHaveLength(2);

    // 内科净贡献 +2000，排第一；外科净贡献 -2000，排第二
    const neike = report.deptAllocations.find((d) => d.dept === '内科');
    const waike = report.deptAllocations.find((d) => d.dept === '外科');
    expect(neike?.income).toBe(5000);
    expect(neike?.expense).toBe(3000);
    expect(neike?.net).toBe(2000);
    expect(neike?.txnCount).toBe(2);
    expect(waike?.income).toBe(2000);
    expect(waike?.expense).toBe(4000);
    expect(waike?.net).toBe(-2000);

    expect(report.deptAllocations[0].dept).toBe('内科');
    expect(report.deptAllocations[1].dept).toBe('外科');
  });
});
