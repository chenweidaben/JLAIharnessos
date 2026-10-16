/**
 * 健澜科技 jlmedaios - 患者体验 V2 纯函数单测（M218-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildPatientExperienceReportV2,
  calculatePatientNPS,
  trackPatientJourneyStep,
} from '../../src/bff/aggregators/patientExperienceReportV2Aggregator';

describe('calculatePatientNPS', () => {
  it('70 推荐 10 贬损 → 75 优秀', () => {
    const r = calculatePatientNPS(70, 10);
    expect(r.nps).toBe(75);
    expect(r.level).toBe('优秀');
  });

  it('10 推荐 70 贬损 → -75 待改进', () => {
    const r = calculatePatientNPS(10, 70);
    expect(r.nps).toBe(-75);
    expect(r.level).toBe('待改进');
  });
});

describe('trackPatientJourneyStep', () => {
  it('就诊步骤 5 反馈 → 75 满意度', () => {
    const r = trackPatientJourneyStep('就诊', 5);
    expect(r.satisfaction).toBe(75);
  });
});

describe('buildPatientExperienceReportV2', () => {
  it('生成旅程数据', () => {
    const r = buildPatientExperienceReportV2('30d');
    expect(r.journey.steps).toBeGreaterThan(0);
  });

  it('生成满意度数据', () => {
    const r = buildPatientExperienceReportV2('30d');
    expect(r.satisfaction.score).toBeGreaterThan(0);
  });

  it('生成投诉数据', () => {
    const r = buildPatientExperienceReportV2('30d');
    expect(r.complaints.total).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildPatientExperienceReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
