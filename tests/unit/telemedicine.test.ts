/**
 * 健澜科技 jlmedaios - 远程医疗纯函数单测（M195-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessTelemedicineQuality,
  buildTelemedicineReport,
  coordinateTeleconsultation,
  type TeleconsultRequest,
  type TelemedicineDiagnosis,
} from '../../src/bff/aggregators/telemedicineAggregator';

describe('coordinateTeleconsultation', () => {
  it('紧急 → 2h', () => {
    const request: TeleconsultRequest = { requestDept: '急诊', expertDept: '心内', priority: 'urgent', modal: 'consultation' };
    expect(coordinateTeleconsultation(request).eta).toBe('2h');
  });

  it('常规 → 24h', () => {
    const request: TeleconsultRequest = { requestDept: '呼吸', expertDept: '影像', priority: 'routine', modal: 'imaging' };
    expect(coordinateTeleconsultation(request).eta).toBe('24h');
  });
});

describe('assessTelemedicineQuality', () => {
  it('及时+准确 → 优秀', () => {
    const d: TelemedicineDiagnosis = { expectedTurnaroundHours: 24, actualTurnaroundHours: 12, accuracy: 0.98 };
    expect(assessTelemedicineQuality(d)).toBe('excellent');
  });

  it('不准 → poor', () => {
    const d: TelemedicineDiagnosis = { expectedTurnaroundHours: 24, actualTurnaroundHours: 48, accuracy: 0.6 };
    expect(assessTelemedicineQuality(d)).toBe('poor');
  });
});

describe('buildTelemedicineReport', () => {
  it('生成会诊数据', () => {
    const r = buildTelemedicineReport('30d');
    expect(r.consultation.inHospital).toBeGreaterThan(0);
  });

  it('生成影像数据', () => {
    const r = buildTelemedicineReport('30d');
    expect(r.imaging.studies).toBeGreaterThan(0);
  });

  it('生成培训数据', () => {
    const r = buildTelemedicineReport('30d');
    expect(r.training.sessions).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildTelemedicineReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
