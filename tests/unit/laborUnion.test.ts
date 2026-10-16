/**
 * 健澜科技 jlmedaios - 工会管理纯函数单测（M194-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessEmployeeSatisfaction,
  buildLaborUnionReport,
  calculateEmployeeWelfare,
  type SurveyData,
  type WelfareData,
} from '../../src/bff/aggregators/laborUnionAggregator';

describe('calculateEmployeeWelfare', () => {
  it('汇总各项福利', () => {
    const data: WelfareData = { festivalAllowance: 2000, birthdayAllowance: 500, healthCheck: 800, insurance: 1000 };
    expect(calculateEmployeeWelfare(data)).toBe(4300);
  });
});

describe('assessEmployeeSatisfaction', () => {
  it('90+ → 优秀', () => {
    const data: SurveyData = { responseRate: 0.8, satisfactionScore: 95 };
    expect(assessEmployeeSatisfaction(data)).toBe('excellent');
  });

  it('70-80 → 一般', () => {
    const data: SurveyData = { responseRate: 0.8, satisfactionScore: 75 };
    expect(assessEmployeeSatisfaction(data)).toBe('fair');
  });
});

describe('buildLaborUnionReport', () => {
  it('生成组织数据', () => {
    const r = buildLaborUnionReport('工会', '30d');
    expect(r.organization.members).toBeGreaterThan(0);
  });

  it('生成职代会', () => {
    const r = buildLaborUnionReport('工会', '30d');
    expect(r.workersCongress.proposals).toBeGreaterThan(0);
  });

  it('生成福利', () => {
    const r = buildLaborUnionReport('工会', '30d');
    expect(r.welfare.perCapita).toBeGreaterThan(0);
  });

  it('生成经费', () => {
    const r = buildLaborUnionReport('工会', '30d');
    expect(r.funds.income).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildLaborUnionReport('工会', '30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
