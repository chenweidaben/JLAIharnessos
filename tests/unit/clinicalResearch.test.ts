/**
 * 健澜科技 jlmedaios - 临床研究纯函数单测（M202-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildClinicalResearchReport,
  calculateTrialEnrollmentRate,
  classifyAdverseEvent,
  type AdverseEventInput,
} from '../../src/bff/aggregators/clinicalResearchAggregator';

describe('calculateTrialEnrollmentRate', () => {
  it('达标 → onTrack', () => {
    const r = calculateTrialEnrollmentRate(100, 90);
    expect(r.rate).toBe(0.9);
    expect(r.onTrack).toBe(true);
  });

  it('未达标 → onTrack=false', () => {
    const r = calculateTrialEnrollmentRate(100, 50);
    expect(r.onTrack).toBe(false);
  });
});

describe('classifyAdverseEvent', () => {
  it('SAE → 需报告', () => {
    const ae: AdverseEventInput = { severity: '重度', serious: true, relationship: '肯定' };
    const r = classifyAdverseEvent(ae);
    expect(r.category).toContain('SAE');
    expect(r.reportable).toBe(true);
  });

  it('一般 AE → 不需报告', () => {
    const ae: AdverseEventInput = { severity: '轻度', serious: false, relationship: '无关' };
    const r = classifyAdverseEvent(ae);
    expect(r.category).toBe('一般 AE');
    expect(r.reportable).toBe(false);
  });
});

describe('buildClinicalResearchReport', () => {
  it('生成试验数据', () => {
    const r = buildClinicalResearchReport('30d');
    expect(r.trials.active).toBeGreaterThan(0);
  });

  it('生成安全数据', () => {
    const r = buildClinicalResearchReport('30d');
    expect(r.safety.totalAE).toBeGreaterThan(0);
  });

  it('生成RWS数据', () => {
    const r = buildClinicalResearchReport('30d');
    expect(r.rws.studies).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildClinicalResearchReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
