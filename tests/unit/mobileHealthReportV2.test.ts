/**
 * 健澜科技 jlmedaios - 移动医疗 V2 纯函数单测（M214-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessMobileAdoption,
  buildMobileHealthReportV2,
  trackMobileUsage,
  type MobileEvent,
} from '../../src/bff/aggregators/mobileHealthReportV2Aggregator';

describe('assessMobileAdoption', () => {
  it('900 / 1000 → 90% 高', () => {
    const r = assessMobileAdoption(900, 1000);
    expect(r.level).toBe('高');
  });

  it('400 / 1000 → 40% 低', () => {
    const r = assessMobileAdoption(400, 1000);
    expect(r.level).toBe('低');
  });
});

describe('trackMobileUsage', () => {
  it('3 事件 → topFeature 正确', () => {
    const events: MobileEvent[] = [
      { type: '挂号', count: 5000 },
      { type: '缴费', count: 8000 },
      { type: '查询', count: 3000 },
    ];
    const r = trackMobileUsage(events);
    expect(r.totalEvents).toBe(16000);
    expect(r.topFeature).toBe('缴费');
  });
});

describe('buildMobileHealthReportV2', () => {
  it('生成移动医护数据', () => {
    const r = buildMobileHealthReportV2('30d');
    expect(r.mobileCare.pda).toBeGreaterThan(0);
  });

  it('生成患者端数据', () => {
    const r = buildMobileHealthReportV2('30d');
    expect(r.patientApp.app).toBeGreaterThan(0);
  });

  it('生成MDM数据', () => {
    const r = buildMobileHealthReportV2('30d');
    expect(r.mdm.devices).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildMobileHealthReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
