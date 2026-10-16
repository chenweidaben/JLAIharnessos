/**
 * 健澜科技 jlmedaios - 手术中心 V2 纯函数单测（M224-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessSurgerySafety,
  buildSurgeryReportV2,
  scheduleOperatingRoom,
} from '../../src/bff/aggregators/surgeryReportV2Aggregator';

describe('assessSurgerySafety', () => {
  it('100项核查 96完成 → 96% 通过', () => {
    expect(assessSurgerySafety(96, 100).pass).toBe(true);
  });

  it('100项核查 90完成 → 90% 不通过', () => {
    expect(assessSurgerySafety(90, 100).pass).toBe(false);
  });
});

describe('scheduleOperatingRoom', () => {
  it('800台 20间 → 每间40台', () => {
    expect(scheduleOperatingRoom(800, 20).perRoom).toBe(40);
  });
});

describe('buildSurgeryReportV2', () => {
  it('生成排程数据', () => {
    const r = buildSurgeryReportV2('30d');
    expect(r.scheduling.cases).toBeGreaterThan(0);
  });

  it('生成Time Out数据', () => {
    const r = buildSurgeryReportV2('30d');
    expect(r.intraop.timeout).toBeGreaterThan(0);
  });

  it('生成分级数据', () => {
    const r = buildSurgeryReportV2('30d');
    expect(r.grading.level3).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildSurgeryReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
