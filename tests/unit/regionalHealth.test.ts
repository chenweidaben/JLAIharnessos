/**
 * 健澜科技 jlmedaios - 区域医联体纯函数单测（M206-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessTwoWayReferralQuality,
  buildRegionalHealthReport,
  buildRegionalResourceMap,
  type ReferralRecord,
  type RegionalUnit,
} from '../../src/bff/aggregators/regionalHealthAggregator';

describe('assessTwoWayReferralQuality', () => {
  it('10 条 5 上 5 下 → 各 50%', () => {
    const records: ReferralRecord[] = [
      { direction: 'up', accepted: true, onTime: true },
      { direction: 'up', accepted: true, onTime: true },
      { direction: 'up', accepted: true, onTime: false },
      { direction: 'up', accepted: true, onTime: true },
      { direction: 'up', accepted: false, onTime: true },
      { direction: 'down', accepted: true, onTime: true },
      { direction: 'down', accepted: true, onTime: true },
      { direction: 'down', accepted: true, onTime: false },
      { direction: 'down', accepted: true, onTime: true },
      { direction: 'down', accepted: true, onTime: true },
    ];
    const r = assessTwoWayReferralQuality(records);
    expect(r.upRate).toBe(0.5);
    expect(r.downRate).toBe(0.5);
  });
});

describe('buildRegionalResourceMap', () => {
  it('三级 2 家 二级 3 家 基层 10 家', () => {
    const units: RegionalUnit[] = [
      { name: 'A', level: '三级', beds: 1000 },
      { name: 'B', level: '三级', beds: 800 },
      { name: 'C', level: '二级', beds: 500 },
      { name: 'D', level: '二级', beds: 400 },
      { name: 'E', level: '二级', beds: 300 },
      { name: 'F', level: '基层', beds: 50 },
    ];
    const r = buildRegionalResourceMap(units);
    expect(r.tertiary).toBe(2);
    expect(r.secondary).toBe(3);
    expect(r.totalBeds).toBe(3050);
  });
});

describe('buildRegionalHealthReport', () => {
  it('生成医联体数据', () => {
    const r = buildRegionalHealthReport('30d');
    expect(r.alliance.members).toBeGreaterThan(0);
  });

  it('生成转诊数据', () => {
    const r = buildRegionalHealthReport('30d');
    expect(r.referral.up).toBeGreaterThan(0);
  });

  it('生成远程医疗数据', () => {
    const r = buildRegionalHealthReport('30d');
    expect(r.telemedicine.consult).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildRegionalHealthReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
