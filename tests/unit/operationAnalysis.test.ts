/**
 * 健澜科技 jlmedaios - 医院运营分析纯函数单测（M163-B，安全与运营）
 *
 * 覆盖：收入分析 / 成本计算 / 效率指标 / 成本效益 / 同行对标 / 问题识别。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildOperationAnalysis,
  benchmarkOperation,
  calculateCostEffectiveness,
  DEMO_OPERATION_DATA,
  identifyOperationIssue,
} from '../../src/bff/aggregators/operationAnalysisAggregator';

describe('operationAnalysis - 收入分析', () => {
  it('汇总门诊/住院/药品/检查收入并计算结构占比', () => {
    const r = buildOperationAnalysis('D001', '2026-10');
    // 480 + 1560 + 620 + 340 = 3000 万元
    expect(r.revenue.total).toBe(3000);
    expect(r.revenue.breakdown.outpatient).toBe(480);
    expect(r.revenue.breakdown.inpatient).toBe(1560);
    // 药占比 = 620/3000 ≈ 0.21
    expect(r.revenue.drugRatio).toBeCloseTo(0.21, 1);
    // 检查占比 = 340/3000 ≈ 0.11
    expect(r.revenue.examRatio).toBeCloseTo(0.11, 1);
    // 结构占比合计约为 1
    const s = r.revenue.structure;
    expect(s.outpatient + s.inpatient + s.drug + s.exam).toBeCloseTo(1, 1);
  });

  it('未知科室编码抛出结构化错误', () => {
    expect(() => buildOperationAnalysis('NOPE', '2026-10')).toThrow(/科室不存在/);
  });
});

describe('operationAnalysis - 成本计算', () => {
  it('汇总人力/药品/耗材/折旧并算结余与结余率', () => {
    const r = buildOperationAnalysis('D001', '2026-10');
    // 720 + 560 + 260 + 180 = 1720 万元
    expect(r.cost.total).toBe(1720);
    // 结余 = 3000 - 1720 = 1280 万元
    expect(r.netBalance).toBe(1280);
    // 结余率 = 1280/3000 ≈ 0.43
    expect(r.margin).toBeCloseTo(0.43, 1);
    // 人力占比 = 720/1720 ≈ 0.42
    expect(r.cost.laborRatio).toBeCloseTo(0.42, 1);
    // 每床收入 = 3000/60 = 50
    expect(r.revenuePerBed).toBe(50);
    // 每出院成本 = 1720/320 = 5.38
    expect(r.costPerDischarge).toBeCloseTo(5.38, 1);
  });

  it('成本效益：每元收入成本、工时产出与得分等级', () => {
    const ce = calculateCostEffectiveness('D001', '2026-10');
    // 成本/收入 = 1720/3000 ≈ 0.57
    expect(ce.costPerRevenue).toBeCloseTo(0.57, 1);
    expect(ce.marginPct).toBeCloseTo(43, 0);
    // 得分在 0-100 区间且等级合法
    expect(ce.score).toBeGreaterThan(0);
    expect(ce.score).toBeLessThanOrEqual(100);
    expect(['A', 'B', 'C', 'D']).toContain(ce.grade);
  });
});

describe('operationAnalysis - 效率指标', () => {
  it('保留床位周转/平均住院日/手术台次原始口径', () => {
    const r = buildOperationAnalysis('D004', '2026-10');
    expect(r.efficiency.bedTurnover).toBe(1.8);
    expect(r.efficiency.avgLodDays).toBe(9.5);
    expect(r.efficiency.surgeryCases).toBe(130);
    expect(r.resource.deviceUtilization).toBe(0.58);
    expect(r.resource.spaceUtilization).toBe(0.55);
  });
});

describe('operationAnalysis - 同行对标', () => {
  it('返回六维对标项、偏离度与全院排名', () => {
    const b = benchmarkOperation('D001', DEMO_OPERATION_DATA);
    expect(b.deptCode).toBe('D001');
    expect(b.peerCount).toBe(5);
    expect(b.items.length).toBe(6);
    // 每项均含 deptValue / peerAvg / delta
    for (const item of b.items) {
      expect(typeof item.deptValue).toBe('number');
      expect(typeof item.peerAvg).toBe('number');
      expect(typeof item.delta).toBe('number');
    }
    // 排名在 1..N 区间
    expect(b.rank).toBeGreaterThanOrEqual(1);
    expect(b.rank).toBeLessThanOrEqual(DEMO_OPERATION_DATA.length);
  });
});

describe('operationAnalysis - 问题识别', () => {
  it('骨科：识别住院日长/周转低/设备与空间利用率低/耗材超标', () => {
    const report = buildOperationAnalysis('D004', '2026-10');
    const issues = identifyOperationIssue('D004', report);
    const metrics = issues.map((i) => i.metric);
    expect(metrics).toContain('avgLodDays');
    expect(metrics).toContain('bedTurnover');
    expect(metrics).toContain('deviceUtilization');
    expect(metrics).toContain('spaceUtilization');
    expect(metrics).toContain('consumableRatio');
    // 至少含一条 warning 级
    expect(issues.some((i) => i.level === 'warning' || i.level === 'critical')).toBe(true);
  });

  it('心血管内科：指标健康时不产生误报', () => {
    const report = buildOperationAnalysis('D001', '2026-10');
    const issues = identifyOperationIssue('D001', report);
    expect(issues.length).toBe(0);
  });

  it('严重亏损病组标记为 critical', () => {
    // 构造一个亏损科室：收入 100、成本 300，其余指标达标
    const report = buildOperationAnalysis('D001', '2026-10');
    const lossReport = {
      ...report,
      revenue: { ...report.revenue, total: 100, breakdown: { outpatient: 40, inpatient: 30, drug: 20, exam: 10 } },
      cost: { ...report.cost, total: 300, breakdown: { labor: 120, drug: 80, consumable: 60, depreciation: 40 } },
      netBalance: -200,
      margin: -2,
    };
    const issues = identifyOperationIssue('D001', lossReport);
    const critical = issues.find((i) => i.metric === 'netBalance');
    expect(critical).toBeDefined();
    expect(critical?.level).toBe('critical');
  });
});
