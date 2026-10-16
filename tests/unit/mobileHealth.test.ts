/**
 * 健澜科技 jlmedaios - 移动医疗纯函数单测（M195-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildMobileHealthReport,
  predictMobileHealthTrend,
  trackMobileUsage,
  type MobileTrendData,
  type MobileUsageData,
} from '../../src/bff/aggregators/mobileHealthAggregator';

describe('trackMobileUsage', () => {
  it('汇总总用户数', () => {
    const data: MobileUsageData = { doctorAppUsers: 500, nurseAppUsers: 800, patientAppUsers: 30000, dailyActiveUsers: 15000, avgSessionMinutes: 15 };
    const r = trackMobileUsage(data);
    expect(r.totalUsers).toBe(31300);
  });

  it('计算 DAU 率', () => {
    const data: MobileUsageData = { doctorAppUsers: 500, nurseAppUsers: 800, patientAppUsers: 30000, dailyActiveUsers: 15000, avgSessionMinutes: 15 };
    const r = trackMobileUsage(data);
    expect(r.dauRate).toBeCloseTo(15000 / 31300, 2);
  });
});

describe('predictMobileHealthTrend', () => {
  it('高增长 → high', () => {
    const data: MobileTrendData = { currentUsers: 30000, growthRate: 0.12 };
    const r = predictMobileHealthTrend(data);
    expect(r.growth).toBe('high');
  });
});

describe('buildMobileHealthReport', () => {
  it('生成医生站数据', () => {
    const r = buildMobileHealthReport('30d');
    expect(r.doctorApp.users).toBeGreaterThan(0);
  });

  it('生成患者端数据', () => {
    const r = buildMobileHealthReport('30d');
    expect(r.patientApp.users).toBeGreaterThan(0);
  });

  it('生成可穿戴数据', () => {
    const r = buildMobileHealthReport('30d');
    expect(r.wearable.devices).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildMobileHealthReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
