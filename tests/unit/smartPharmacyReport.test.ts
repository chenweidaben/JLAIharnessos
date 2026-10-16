/**
 * 健澜科技 jlmedaios - 智慧药房纯函数单测（M214-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessDispensingAccuracy,
  buildSmartPharmacyReport,
  generateMedicationReminder,
  type MedicationReminder,
} from '../../src/bff/aggregators/smartPharmacyReportAggregator';

describe('assessDispensingAccuracy', () => {
  it('10000 调配 5 错误 → 99.95% 优秀', () => {
    const r = assessDispensingAccuracy(10000, 5);
    expect(r.level).toBe('优秀');
  });

  it('10000 调配 50 错误 → 99.5% 达标', () => {
    const r = assessDispensingAccuracy(10000, 50);
    expect(r.level).toBe('达标');
  });

  it('10000 调配 200 错误 → 98% 不达标', () => {
    const r = assessDispensingAccuracy(10000, 200);
    expect(r.level).toBe('不达标');
  });
});

describe('generateMedicationReminder', () => {
  it('生成提醒文本', () => {
    const p: MedicationReminder = { drug: '阿莫西林', frequency: '每日三次' };
    const r = generateMedicationReminder(p);
    expect(r).toContain('阿莫西林');
  });
});

describe('buildSmartPharmacyReport', () => {
  it('生成自动化数据', () => {
    const r = buildSmartPharmacyReport('30d');
    expect(r.automated.smartCabinet).toBeGreaterThan(0);
  });

  it('生成PIVAS数据', () => {
    const r = buildSmartPharmacyReport('30d');
    expect(r.pivas.prepared).toBeGreaterThan(0);
  });

  it('生成中药房数据', () => {
    const r = buildSmartPharmacyReport('30d');
    expect(r.tcm.decoctionPieces).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildSmartPharmacyReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
