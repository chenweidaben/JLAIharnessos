/**
 * 健澜科技 jlmedaios - 麻醉管理纯函数单测（M190-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildAnesthesiaReport,
  calculateAnesthesiaWorkload,
  detectAnesthesiaComplication,
  type AnesthesiaRecord,
} from '../../src/bff/aggregators/anesthesiaAggregator';

describe('detectAnesthesiaComplication', () => {
  it('无并发症 → none', () => {
    const r: AnesthesiaRecord = { patientId: 'P1', asaGrade: 'II', anesthesiaType: 'general', duration: 2 };
    expect(detectAnesthesiaComplication(r).hasComplication).toBe(false);
  });

  it('循环并发症 → 检出', () => {
    const r: AnesthesiaRecord = { patientId: 'P1', asaGrade: 'III', anesthesiaType: 'general', duration: 3, complications: ['circulation'] };
    const c = detectAnesthesiaComplication(r);
    expect(c.hasComplication).toBe(true);
    expect(c.types).toContain('circulation');
  });
});

describe('calculateAnesthesiaWorkload', () => {
  it('总时长 = 各记录之和', () => {
    const records: AnesthesiaRecord[] = [
      { patientId: 'P1', asaGrade: 'II', anesthesiaType: 'general', duration: 2 },
      { patientId: 'P2', asaGrade: 'III', anesthesiaType: 'general', duration: 3 },
    ];
    expect(calculateAnesthesiaWorkload(records).totalHours).toBe(5);
  });

  it('平均时长 = 总时长/例数', () => {
    const records: AnesthesiaRecord[] = [
      { patientId: 'P1', asaGrade: 'II', anesthesiaType: 'general', duration: 2 },
      { patientId: 'P2', asaGrade: 'III', anesthesiaType: 'general', duration: 4 },
    ];
    expect(calculateAnesthesiaWorkload(records).avgHours).toBe(3);
  });

  it('空列表 → 0', () => {
    expect(calculateAnesthesiaWorkload([]).totalHours).toBe(0);
  });
});

describe('buildAnesthesiaReport', () => {
  it('生成麻醉例数', () => {
    const r = buildAnesthesiaReport('麻醉科', '30d');
    expect(r.totalCases).toBeGreaterThan(0);
  });

  it('生成 ASA 分布', () => {
    const r = buildAnesthesiaReport('麻醉科', '30d');
    expect(r.asaDistribution.length).toBeGreaterThan(0);
  });

  it('生成设备预警', () => {
    const r = buildAnesthesiaReport('麻醉科', '30d');
    expect(r.equipmentAlerts.length).toBeGreaterThan(0);
  });
});
