/**
 * 健澜科技 jlmedaios - 远程医疗 V2 纯函数单测（M214-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessTeleconsultQuality,
  buildTelemedicineReportV2,
  trackTelemedicineSLA,
  type Teleconsult,
} from '../../src/bff/aggregators/telemedicineReportV2Aggregator';

describe('assessTeleconsultQuality', () => {
  it('20 会诊 19 完成 → 95% 优秀', () => {
    const consults: Teleconsult[] = Array.from({ length: 20 }, (_, i) => ({
      type: '远程',
      completed: i < 19,
      turnaroundHours: 24,
    }));
    const r = assessTeleconsultQuality(consults);
    expect(r.level).toBe('优秀');
  });

  it('20 会诊 15 完成 → 75% 不达标', () => {
    const consults: Teleconsult[] = Array.from({ length: 20 }, (_, i) => ({
      type: '远程',
      completed: i < 15,
      turnaroundHours: 24,
    }));
    const r = assessTeleconsultQuality(consults);
    expect(r.level).toBe('不达标');
  });
});

describe('trackTelemedicineSLA', () => {
  it('10 分钟响应 → 优秀', () => {
    const r = trackTelemedicineSLA(10);
    expect(r.slaMet).toBe(true);
    expect(r.level).toBe('优秀');
  });

  it('90 分钟响应 → 超标', () => {
    const r = trackTelemedicineSLA(90);
    expect(r.slaMet).toBe(false);
    expect(r.level).toBe('超标');
  });
});

describe('buildTelemedicineReportV2', () => {
  it('生成会诊数据', () => {
    const r = buildTelemedicineReportV2('30d');
    expect(r.consult.remote).toBeGreaterThan(0);
  });

  it('生成影像数据', () => {
    const r = buildTelemedicineReportV2('30d');
    expect(r.imaging.radiology).toBeGreaterThan(0);
  });

  it('生成设备数据', () => {
    const r = buildTelemedicineReportV2('30d');
    expect(r.equipment.sla).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildTelemedicineReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
