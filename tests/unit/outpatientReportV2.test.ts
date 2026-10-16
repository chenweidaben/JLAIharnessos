/**
 * 健澜科技 jlmedaios - 门诊管理 V2 纯函数单测（M225-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessOutpatientEfficiency,
  buildOutpatientReportV2,
  calculateNoShowRate,
} from '../../src/bff/aggregators/outpatientReportV2Aggregator';

describe('assessOutpatientEfficiency', () => {
  it('候诊20分钟 → 优秀', () => {
    expect(assessOutpatientEfficiency(5000, 20).level).toBe('优秀');
  });

  it('候诊50分钟 → 待改进', () => {
    expect(assessOutpatientEfficiency(5000, 50).level).toBe('待改进');
  });
});

describe('calculateNoShowRate', () => {
  it('60000预约 3000爽约 → 5%', () => {
    expect(calculateNoShowRate(60000, 3000).rate).toBe(5);
  });
});

describe('buildOutpatientReportV2', () => {
  it('生成预约数据', () => {
    const r = buildOutpatientReportV2('30d');
    expect(r.appointment.scheduled).toBeGreaterThan(0);
  });

  it('生成分诊数据', () => {
    const r = buildOutpatientReportV2('30d');
    expect(r.triage.visits).toBeGreaterThan(0);
  });

  it('生成处方数据', () => {
    const r = buildOutpatientReportV2('30d');
    expect(r.prescription.reviewed).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildOutpatientReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
