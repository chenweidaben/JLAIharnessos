/**
 * 健澜科技 jlmedaios — 【CDSS与运营精细化】医院预算与成本管理深化纯函数单测（M165-B）
 *
 * 覆盖：buildDepartmentBudget（驱动因子量价测算/四大类合计）、
 *       trackBudgetExecution（进度基准/执行率/状态分档）、
 *       predictBudgetOverrun（月均运行率年化外推/风险分档）、
 *       optimizeBudgetAllocation（长期结余→长期超支调剂建议）。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildDepartmentBudget,
  optimizeBudgetAllocation,
  predictBudgetOverrun,
  trackBudgetExecution,
  type CategoryHistory,
  type DeptBudgetDrivers,
  type ExecutionLine,
} from '../../src/bff/aggregators/budgetDeepAggregator';

/** 一个内科科室的真实驱动因子（200 床规模三甲） */
const drivers: DeptBudgetDrivers = {
  deptCode: 'internal_medicine',
  deptName: '普通内科',
  headcount: 40,
  avgMonthlySalary: 12000,
  performanceRatio: 0.3,
  socialInsuranceRatio: 0.32,
  trainingPerHeadYear: 2000,
  expectedOutpatientVisits: 120000,
  drugCostPerVisit: 120,
  westMedicineRatio: 0.7,
  inpatientBedDays: 73000, // 200床×365
  consumableCostPerBedDay: 35,
  equipmentPurchase: 800000,
  equipmentBookValue: 5000000,
  depreciationYears: 10,
  maintenanceRate: 0.05,
  areaSqm: 1500,
  utilityPerSqmYear: 80,
  officePerHeadYear: 1500,
  travelQuota: 60000,
  meetingBudget: 40000,
};

describe('buildDepartmentBudget（驱动因子测算，不拍脑袋）', () => {
  it('人力成本：工资=人数×月薪×12，绩效/社保按比例，培训按人头', () => {
    const b = buildDepartmentBudget(drivers, 2026, 'labor');
    expect(b.category).toBe('labor');
    expect(b.lines).toHaveLength(4);
    const bySub = Object.fromEntries(b.lines.map((l) => [l.sub, l]));
    // 工资 = 40 × 12000 × 12 = 5,760,000
    expect(bySub.salary.amount).toBe(5760000);
    // 绩效 = 5,760,000 × 0.3 = 1,728,000
    expect(bySub.performance.amount).toBe(1728000);
    // 社保 = 5,760,000 × 0.32 = 1,843,200
    expect(bySub.social_security.amount).toBe(1843200);
    // 培训 = 40 × 2000 = 80,000
    expect(bySub.training.amount).toBe(80000);
    expect(b.total).toBe(5760000 + 1728000 + 1843200 + 80000);
  });

  it('药品耗材：门诊药费拆西药/中成药，耗材按床日', () => {
    const b = buildDepartmentBudget(drivers, 2026, 'drug');
    const bySub = Object.fromEntries(b.lines.map((l) => [l.sub, l]));
    // 门诊药品总额 = 120000 × 120 = 14,400,000；西药 70% = 10,080,000
    expect(bySub.west_medicine.amount).toBe(10080000);
    // 中成药 30% = 4,320,000
    expect(bySub.patent_drug.amount).toBe(4320000);
    // 耗材 = 73000 × 35 = 2,555,000
    expect(bySub.consumable.amount).toBe(2555000);
  });

  it('设备：采购 + 直线折旧 + 维护费', () => {
    const b = buildDepartmentBudget(drivers, 2026, 'equipment');
    const bySub = Object.fromEntries(b.lines.map((l) => [l.sub, l]));
    expect(bySub.purchase.amount).toBe(800000);
    // 折旧 = 5,000,000 / 10 = 500,000
    expect(bySub.depreciation.amount).toBe(500000);
    // 维护 = 5,000,000 × 0.05 = 250,000
    expect(bySub.maintenance.amount).toBe(250000);
  });

  it('运营：水电按面积、办公按人头、差旅会议定额', () => {
    const b = buildDepartmentBudget(drivers, 2026, 'operation');
    const bySub = Object.fromEntries(b.lines.map((l) => [l.sub, l]));
    expect(bySub.utility.amount).toBe(1500 * 80);       // 120,000
    expect(bySub.office.amount).toBe(40 * 1500);        // 60,000
    expect(bySub.travel.amount).toBe(60000);
    expect(bySub.meeting.amount).toBe(40000);
  });

  it('category=all 返回四大类全部明细，total 等于各类之和', () => {
    const all = buildDepartmentBudget(drivers, 2026, 'all');
    expect(all.lines.length).toBe(4 + 3 + 3 + 4); // 14 行
    const labor = buildDepartmentBudget(drivers, 2026, 'labor').total;
    const drug = buildDepartmentBudget(drivers, 2026, 'drug').total;
    const equip = buildDepartmentBudget(drivers, 2026, 'equipment').total;
    const op = buildDepartmentBudget(drivers, 2026, 'operation').total;
    expect(all.total).toBe(labor + drug + equip + op);
  });
});

describe('trackBudgetExecution（执行跟踪，进度基准线）', () => {
  // 年预算 1,200,000 的一条线，月基准 = 100,000
  const lines: ExecutionLine[] = [
    { category: 'labor', sub: 'salary', subName: '工资', annualBudget: 1200000,
      // 前 6 个月每月花 100,000 → 正好按进度
      spentByMonth: [100000, 100000, 100000, 100000, 100000, 100000] },
    { category: 'drug', sub: 'consumable', subName: '耗材', annualBudget: 1200000,
      // 前 6 个月每月花 130,000 → 超进度 30%（over）
      spentByMonth: [130000, 130000, 130000, 130000, 130000, 130000] },
    { category: 'operation', sub: 'office', subName: '办公', annualBudget: 1200000,
      // 前 6 个月每月花 60,000 → 仅 60% 进度（ahead 结余）
      spentByMonth: [60000, 60000, 60000, 60000, 60000, 60000] },
  ];

  it('截至 6 月：进度基准 = 年预算/12×6 = 600,000', () => {
    const r = trackBudgetExecution({ deptCode: 'im', deptName: '内科', year: 2026, lines }, { upToMonth: 6 });
    expect(r.upToMonth).toBe(6);
    const salary = r.lines.find((l) => l.sub === 'salary')!;
    expect(salary.spentYtd).toBe(600000);
    expect(salary.paceBudget).toBe(600000);
    expect(salary.executionRate).toBeCloseTo(0.5, 2);
  });

  it('状态分档：按进度花=on_track；超进度>15%=over；进度落后>10%=ahead', () => {
    const r = trackBudgetExecution({ deptCode: 'im', deptName: '内科', year: 2026, lines }, { upToMonth: 6 });
    expect(r.lines.find((l) => l.sub === 'salary')!.status).toBe('on_track');
    expect(r.lines.find((l) => l.sub === 'consumable')!.status).toBe('over');
    expect(r.lines.find((l) => l.sub === 'office')!.status).toBe('ahead');
  });

  it('categoryRollup 按大类汇总，totalBudget = 各线年预算之和', () => {
    const r = trackBudgetExecution({ deptCode: 'im', deptName: '内科', year: 2026, lines }, { upToMonth: 6 });
    expect(r.totalBudget).toBe(3600000);
    expect(r.categoryRollup).toHaveLength(3);
  });
});

describe('predictBudgetOverrun（月均运行率年化外推）', () => {
  it('持续超进度 → red 风险，年末预测 > 年预算，预计超支为正', () => {
    // 年预算 1,200,000；前 6 个月每月花 130,000 → 月均 130,000，年化 1,560,000
    const lines: ExecutionLine[] = [
      { category: 'drug', sub: 'consumable', subName: '耗材', annualBudget: 1200000,
        spentByMonth: [130000, 130000, 130000, 130000, 130000, 130000] },
    ];
    const f = predictBudgetOverrun({ deptCode: 'im', year: 2026, lines }, 2026);
    expect(f.asOfMonth).toBe(6);
    expect(f.overallRisk).toBe('red');
    expect(f.totalProjected).toBeGreaterThan(f.totalBudget);
    expect(f.totalOverrun).toBeGreaterThan(0);
  });

  it('按进度花 → green 风险，预计基本不超支', () => {
    // 年预算 1,200,000；前 6 个月每月花 100,000 → 年化 1,200,000
    const lines: ExecutionLine[] = [
      { category: 'labor', sub: 'salary', subName: '工资', annualBudget: 1200000,
        spentByMonth: [100000, 100000, 100000, 100000, 100000, 100000] },
    ];
    const f = predictBudgetOverrun({ deptCode: 'im', year: 2026, lines }, 2026);
    expect(f.overallRisk).not.toBe('red');
    expect(f.totalOverrun).toBeLessThan(120000); // 基本打平
  });
});

describe('optimizeBudgetAllocation（结构优化建议）', () => {
  it('长期结余大类向长期超支大类调剂，只出建议不自动调账', () => {
    const history: CategoryHistory[] = [
      // 运营费常年只花 70% → 可调剂
      { category: 'operation', label: '运营管理', annualBudget: 1000000, avgUtilization: 0.7 },
      // 会议常年只花 60% → 可调剂更多
      { category: 'equipment', label: '设备折旧', annualBudget: 2000000, avgUtilization: 0.6 },
      // 药品常年超支 15% → 需要补
      { category: 'drug', label: '药品耗材', annualBudget: 10000000, avgUtilization: 1.15 },
      // 人力按预算花 → 不动
      { category: 'labor', label: '人力成本', annualBudget: 8000000, avgUtilization: 0.98 },
    ];
    const r = optimizeBudgetAllocation({ deptCode: 'im', year: 2026 }, history);
    expect(r.suggestions.length).toBeGreaterThan(0);
    // 所有建议都应从结余大类流向药品
    for (const s of r.suggestions) {
      expect(s.target).toBe('drug');
      expect(['operation', 'equipment']).toContain(s.source);
      expect(s.amount).toBeGreaterThan(0);
    }
    // 调剂总额 = 各建议之和
    expect(r.totalReallocated).toBeCloseTo(r.suggestions.reduce((a, s) => a + s.amount, 0), 0);
  });

  it('全部按预算执行 → 无可调剂建议', () => {
    const history: CategoryHistory[] = [
      { category: 'labor', label: '人力成本', annualBudget: 8000000, avgUtilization: 0.98 },
      { category: 'drug', label: '药品耗材', annualBudget: 10000000, avgUtilization: 1.0 },
    ];
    const r = optimizeBudgetAllocation({ deptCode: 'im', year: 2026 }, history);
    expect(r.suggestions).toHaveLength(0);
    expect(r.totalReallocated).toBe(0);
  });
});
