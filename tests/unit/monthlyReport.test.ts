/**
 * 健澜科技 jlmedaios - 科室月度运营报表纯函数单测
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  ANTIBIOTIC_TARGET_PCT,
  buildMonthlyReport,
  drgStatus,
  generateView,
  qcGrade,
} from '../../src/bff/aggregators/monthlyReportAggregator';

describe('qcGrade', () => {
  it('按分数分档', () => {
    expect(qcGrade(95)).toBe('A');
    expect(qcGrade(90)).toBe('A');
    expect(qcGrade(85)).toBe('B');
    expect(qcGrade(75)).toBe('C');
    expect(qcGrade(60)).toBe('D');
  });
});

describe('drgStatus', () => {
  it('盈亏方向', () => {
    expect(drgStatus(5000)).toBe('profit');
    expect(drgStatus(-3000)).toBe('loss');
    expect(drgStatus(0)).toBe('balanced');
  });
});

describe('buildMonthlyReport', () => {
  const base = {
    outpatientCount: 8000,
    inpatientCount: 1200,
    drgProfitLoss: 32000,
    qcScore: 92,
    antibioticUse: 45,
  };

  it('门住院总量为两者之和', () => {
    const r = buildMonthlyReport(base);
    expect(r.kpi.totalVolume).toBe(9200);
  });

  it('派生等级与达标标记', () => {
    const r = buildMonthlyReport(base);
    expect(r.kpi.qcGrade).toBe('A');
    expect(r.kpi.drgStatus).toBe('profit');
    expect(r.kpi.antibioticCompliant).toBe(true);
  });

  it('抗菌药超过阈值判为不达标', () => {
    const r = buildMonthlyReport({ ...base, antibioticUse: ANTIBIOTIC_TARGET_PCT + 5 });
    expect(r.kpi.antibioticCompliant).toBe(false);
    const row = r.summary.find((x) => x.indicator === '抗菌药物使用率');
    expect(row?.status).toBe('bad');
  });

  it('超支 DRG 行状态为 bad', () => {
    const r = buildMonthlyReport({ ...base, drgProfitLoss: -10000 });
    expect(r.kpi.drgStatus).toBe('loss');
    const row = r.summary.find((x) => x.indicator === 'DRG 盈亏');
    expect(row?.status).toBe('bad');
  });

  it('汇总行覆盖六项指标', () => {
    const r = buildMonthlyReport(base);
    expect(r.summary).toHaveLength(6);
    expect(r.summary.map((x) => x.indicator)).toEqual([
      '门诊量', '住院量', '门住院总量', 'DRG 盈亏', '质控得分', '抗菌药物使用率',
    ]);
  });
});

describe('generateView', () => {
  it('返回 demo 数据且带月份', () => {
    const v = generateView('2026-09');
    expect(v.demo).toBe(true);
    expect(v.month).toBe('2026-09');
    expect(v.kpi.totalVolume).toBe(v.kpi.outpatientCount + v.kpi.inpatientCount);
  });

  it('同月结果稳定，非法月份回退', () => {
    expect(generateView('2026-09')).toEqual(generateView('2026-09'));
    const fallback = generateView('bad-month');
    expect(/^\d{4}-(0[1-9]|1[0-2])$/.test(fallback.month)).toBe(true);
  });
});
