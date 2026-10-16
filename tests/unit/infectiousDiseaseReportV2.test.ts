/**
 * 健澜科技 jlmedaios - 传染病防控 V2 纯函数单测（M221-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessReportTimeliness,
  buildInfectiousDiseaseReportV2,
  detectOutbreak,
} from '../../src/bff/aggregators/infectiousDiseaseReportV2Aggregator';

describe('assessReportTimeliness', () => {
  it('500报告 480及时 → 96% 合规', () => {
    const r = assessReportTimeliness(500, 480);
    expect(r.rate).toBe(96);
    expect(r.compliant).toBe(true);
  });

  it('100报告 80及时 → 80% 不合规', () => {
    const r = assessReportTimeliness(100, 80);
    expect(r.compliant).toBe(false);
  });
});

describe('detectOutbreak', () => {
  it('阈值10 当前25 → 暴发', () => {
    expect(detectOutbreak(25, 10).outbreak).toBe(true);
  });

  it('阈值10 当前15 → 预警', () => {
    expect(detectOutbreak(15, 10).level).toBe('预警');
  });
});

describe('buildInfectiousDiseaseReportV2', () => {
  it('生成报告数据', () => {
    const r = buildInfectiousDiseaseReportV2('30d');
    expect(r.reporting.total).toBeGreaterThan(0);
  });

  it('生成发热门诊数据', () => {
    const r = buildInfectiousDiseaseReportV2('30d');
    expect(r.feverClinic.visits).toBeGreaterThan(0);
  });

  it('生成疫苗数据', () => {
    const r = buildInfectiousDiseaseReportV2('30d');
    expect(r.vaccine.doses).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildInfectiousDiseaseReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
