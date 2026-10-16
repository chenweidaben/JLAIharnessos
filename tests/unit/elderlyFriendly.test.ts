/**
 * 健澜科技 jlmedaios - 适老化纯函数单测（M199-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessElderlyFriendly,
  buildElderlyFriendlyReport,
  generateElderlyReminder,
  type InterfaceData,
  type PatientData,
} from '../../src/bff/aggregators/elderlyFriendlyAggregator';

describe('assessElderlyFriendly', () => {
  it('全功能启用 → excellent', () => {
    const data: InterfaceData = { fontScale: 2, contrastMode: true, simplifiedLayout: true, voiceInteraction: true };
    expect(assessElderlyFriendly(data).level).toBe('excellent');
  });

  it('功能缺失 → poor', () => {
    const data: InterfaceData = { fontScale: 1, contrastMode: false, simplifiedLayout: false, voiceInteraction: false };
    expect(assessElderlyFriendly(data).level).toBe('poor');
    expect(assessElderlyFriendly(data).issues.length).toBeGreaterThan(0);
  });
});

describe('generateElderlyReminder', () => {
  it('生成就诊提醒', () => {
    const patient: PatientData = { name: '张大爷', nextAppointment: '2026-10-20', medications: ['降压药'] };
    const r = generateElderlyReminder(patient);
    expect(r.reminders.length).toBe(2);
    expect(r.reminders[0]).toContain('张大爷');
  });
});

describe('buildElderlyFriendlyReport', () => {
  it('生成界面数据', () => {
    const r = buildElderlyFriendlyReport('30d');
    expect(r.interface.largeFont).toBe(true);
  });

  it('生成语音数据', () => {
    const r = buildElderlyFriendlyReport('30d');
    expect(r.voice.dialect).toBeGreaterThan(0);
  });

  it('生成远程关爱数据', () => {
    const r = buildElderlyFriendlyReport('30d');
    expect(r.remote.videoConsult).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildElderlyFriendlyReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
