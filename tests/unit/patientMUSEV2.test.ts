/**
 * 健澜科技 jlmedaios - Patient MUSE V2 纯函数单测（M186-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildPatientMUSE,
  generatePatientReminder,
} from '../../src/bff/aggregators/patientMUSEV2Aggregator';

describe('buildPatientMUSE', () => {
  it('返回就诊提醒', () => {
    const r = buildPatientMUSE('p1', '2026-10-16');
    expect(r.visitReminder).not.toBeNull();
    expect(r.visitReminder!.department).toContain('心内科');
  });

  it('返回用药列表', () => {
    const r = buildPatientMUSE('p1', '2026-10-16');
    expect(r.medications.length).toBeGreaterThan(0);
  });

  it('返回健康知识推荐', () => {
    const r = buildPatientMUSE('p1', '2026-10-16');
    expect(r.healthTips.length).toBeGreaterThan(0);
  });

  it('满意度调查可用', () => {
    const r = buildPatientMUSE('p1', '2026-10-16');
    expect(r.satisfactionSurvey.available).toBe(true);
  });
});

describe('generatePatientReminder', () => {
  it('包含患者ID', () => {
    const msg = generatePatientReminder('p123');
    expect(msg).toContain('p123');
  });

  it('包含就诊提示', () => {
    const msg = generatePatientReminder('p1');
    expect(msg).toContain('就诊');
  });
});
