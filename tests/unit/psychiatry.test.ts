/**
 * 健澜科技 jlmedaios - 精神心理纯函数单测（M202-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildPsychiatryReport,
  classifySleepDisorder,
  scoreDepressionSeverity,
  type PSGData,
} from '../../src/bff/aggregators/psychiatryAggregator';

describe('scoreDepressionSeverity', () => {
  it('重度抑郁', () => {
    const r = scoreDepressionSeverity(22);
    expect(r.level).toBe('重度抑郁');
  });

  it('无抑郁', () => {
    const r = scoreDepressionSeverity(2);
    expect(r.level).toBe('无抑郁');
  });

  it('中度抑郁', () => {
    const r = scoreDepressionSeverity(16);
    expect(r.level).toBe('中度抑郁');
  });
});

describe('classifySleepDisorder', () => {
  it('重度 OSA', () => {
    const psg: PSGData = { sleepEfficiency: 80, apneaIndex: 35, remLatencyMin: 90, totalSleepMin: 360 };
    const r = classifySleepDisorder(psg);
    expect(r.diagnosis).toContain('OSA');
    expect(r.severity).toBe('重度');
  });

  it('失眠', () => {
    const psg: PSGData = { sleepEfficiency: 65, apneaIndex: 2, remLatencyMin: 120, totalSleepMin: 300 };
    const r = classifySleepDisorder(psg);
    expect(r.diagnosis).toBe('失眠');
  });
});

describe('buildPsychiatryReport', () => {
  it('生成门诊数据', () => {
    const r = buildPsychiatryReport('精神科', '30d');
    expect(r.outpatient.visits).toBeGreaterThan(0);
  });

  it('生成睡眠数据', () => {
    const r = buildPsychiatryReport('睡眠中心', '30d');
    expect(r.sleep.psgStudies).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildPsychiatryReport('精神科', '30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
