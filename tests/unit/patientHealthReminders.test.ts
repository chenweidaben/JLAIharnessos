/**
 * 健澜科技 jlmedaios - 患者健康提醒纯函数测试（M122-C）
 *
 * 覆盖：提醒生成、时间计算、慢病管理规则。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildPatientHealthReminders,
  type PatientAppointment,
  type PatientChronicDisease,
  type PatientMedication,
} from '../../src/bff/aggregators/patientHealthRemindersAggregator.js';

const NOW = new Date('2026-10-16T10:00:00');
const H = 3600_000;

function at(msFromNow: number): string {
  return new Date(NOW.getTime() + msFromNow).toISOString();
}

describe('buildPatientHealthReminders - 空输入', () => {
  it('全空输入返回四类空数组', () => {
    const r = buildPatientHealthReminders('p1', [], [], [], NOW);
    expect(r.medicationReminders).toEqual([]);
    expect(r.appointmentReminders).toEqual([]);
    expect(r.prepReminders).toEqual([]);
    expect(r.chronicCareReminders).toEqual([]);
  });

  it('可选参数缺省也不报错', () => {
    const r = buildPatientHealthReminders('p1');
    expect(r.medicationReminders).toEqual([]);
  });
});

describe('用药提醒 - 时间计算', () => {
  it('2 小时内服药 → urgent 即将服药', () => {
    const meds: PatientMedication[] = [
      { id: 'm1', name: '氨氯地平片', dosage: '5mg', nextDoseAt: at(1 * H) },
    ];
    const r = buildPatientHealthReminders('p1', meds, [], [], NOW);
    expect(r.medicationReminders).toHaveLength(1);
    expect(r.medicationReminders[0].level).toBe('urgent');
    expect(r.medicationReminders[0].title).toBe('即将服药');
  });

  it('delta=0 恰好到点 → urgent', () => {
    const meds: PatientMedication[] = [{ id: 'm2', name: '阿司匹林', nextDoseAt: NOW.toISOString() }];
    const r = buildPatientHealthReminders('p1', meds, [], [], NOW);
    expect(r.medicationReminders[0].level).toBe('urgent');
  });

  it('已过点 1 小时 → warning 该服药了', () => {
    const meds: PatientMedication[] = [
      { id: 'm3', name: '二甲双胍', dosage: '0.5g', nextDoseAt: at(-1 * H) },
    ];
    const r = buildPatientHealthReminders('p1', meds, [], [], NOW);
    expect(r.medicationReminders[0].level).toBe('warning');
    expect(r.medicationReminders[0].body).toContain('已过服药时间');
  });

  it('今日 5 小时后服药 → normal 今日用药提醒', () => {
    const meds: PatientMedication[] = [
      { id: 'm4', name: '缬沙坦', nextDoseAt: at(5 * H) },
    ];
    const r = buildPatientHealthReminders('p1', meds, [], [], NOW);
    expect(r.medicationReminders[0].level).toBe('normal');
  });

  it('48 小时后服药 → 不提醒', () => {
    const meds: PatientMedication[] = [{ id: 'm5', name: '钙片', nextDoseAt: at(48 * H) }];
    const r = buildPatientHealthReminders('p1', meds, [], [], NOW);
    expect(r.medicationReminders).toHaveLength(0);
  });

  it('用药周期已结束 → 不提醒', () => {
    const meds: PatientMedication[] = [
      { id: 'm6', name: '过期药', nextDoseAt: at(1 * H), endDate: '2026-10-15' },
    ];
    const r = buildPatientHealthReminders('p1', meds, [], [], NOW);
    expect(r.medicationReminders).toHaveLength(0);
  });

  it('用药周期今天截止 → 仍提醒', () => {
    const meds: PatientMedication[] = [
      { id: 'm7', name: '今天最后一天', nextDoseAt: at(1 * H), endDate: '2026-10-16' },
    ];
    const r = buildPatientHealthReminders('p1', meds, [], [], NOW);
    expect(r.medicationReminders).toHaveLength(1);
  });
});

describe('就诊提醒 - 时间计算', () => {
  const base: PatientAppointment = {
    id: 'a1', scheduledAt: '', department: '心内科', purpose: '复诊', status: 'confirmed',
  };

  it('2 小时内 → urgent', () => {
    const appts = [{ ...base, id: 'a1', scheduledAt: at(1 * H) }];
    const r = buildPatientHealthReminders('p1', [], appts, [], NOW);
    expect(r.appointmentReminders[0].level).toBe('urgent');
  });

  it('20 小时后（明天）→ warning', () => {
    const appts = [{ ...base, id: 'a2', scheduledAt: at(20 * H) }];
    const r = buildPatientHealthReminders('p1', [], appts, [], NOW);
    expect(r.appointmentReminders[0].level).toBe('warning');
    expect(r.appointmentReminders[0].title).toBe('明天有预约');
  });

  it('3 天后 → normal', () => {
    const appts = [{ ...base, id: 'a3', scheduledAt: at(3 * 24 * H) }];
    const r = buildPatientHealthReminders('p1', [], appts, [], NOW);
    expect(r.appointmentReminders[0].level).toBe('normal');
  });

  it('已取消/已完成 → 忽略；过去的预约 → 忽略', () => {
    const appts: PatientAppointment[] = [
      { ...base, id: 'a4', scheduledAt: at(1 * H), status: 'cancelled' },
      { ...base, id: 'a5', scheduledAt: at(1 * H), status: 'completed' },
      { ...base, id: 'a6', scheduledAt: at(-1 * H), status: 'scheduled' },
    ];
    const r = buildPatientHealthReminders('p1', [], appts, [], NOW);
    expect(r.appointmentReminders).toHaveLength(0);
  });
});

describe('检查准备提醒', () => {
  it('空腹类检查 20h 后 → 生成空腹准备提醒', () => {
    const appts: PatientAppointment[] = [
      { id: 'p1', scheduledAt: at(20 * H), department: '检验科', purpose: '抽血化验空腹血糖', status: 'scheduled' },
    ];
    const r = buildPatientHealthReminders('p1', [], appts, [], NOW);
    expect(r.prepReminders).toHaveLength(1);
    expect(r.prepReminders[0].body).toContain('空腹');
  });

  it('普通复诊 → 不生成准备提醒', () => {
    const appts: PatientAppointment[] = [
      { id: 'p2', scheduledAt: at(20 * H), department: '心内科', purpose: '普通复诊', status: 'scheduled' },
    ];
    const r = buildPatientHealthReminders('p1', [], appts, [], NOW);
    expect(r.prepReminders).toHaveLength(0);
  });

  it('48h 之外的检查 → 不提醒', () => {
    const appts: PatientAppointment[] = [
      { id: 'p3', scheduledAt: at(72 * H), department: '内镜中心', purpose: '胃肠镜', status: 'scheduled' },
    ];
    const r = buildPatientHealthReminders('p1', [], appts, [], NOW);
    expect(r.prepReminders).toHaveLength(0);
  });
});

describe('慢病照护规则', () => {
  it('随访逾期 5 天 → warning', () => {
    const ds: PatientChronicDisease[] = [
      { disease: 'hypertension', nextFollowupAt: at(-5 * 24 * H).slice(0, 10) },
    ];
    const r = buildPatientHealthReminders('p1', [], [], ds, NOW);
    const fu = r.chronicCareReminders.find((x) => x.title === '慢病随访已逾期');
    expect(fu).toBeDefined();
    expect(fu?.body).toContain('高血压');
    expect(fu?.body).toContain('5 天');
  });

  it('随访 3 天后 → normal 随访临近', () => {
    const ds: PatientChronicDisease[] = [
      { disease: 'diabetes', nextFollowupAt: at(3 * 24 * H).slice(0, 10) },
    ];
    const r = buildPatientHealthReminders('p1', [], [], ds, NOW);
    const fu = r.chronicCareReminders.find((x) => x.title === '慢病随访临近');
    expect(fu?.body).toContain('糖尿病');
  });

  it('从未自测 → 生成今日自测提醒', () => {
    const ds: PatientChronicDisease[] = [
      { disease: 'hypertension', nextFollowupAt: at(10 * 24 * H).slice(0, 10), lastVitalsAt: null },
    ];
    const r = buildPatientHealthReminders('p1', [], [], ds, NOW);
    const m = r.chronicCareReminders.find((x) => x.title === '今日自测提醒');
    expect(m?.body).toContain('血压');
  });

  it('1 小时前刚测过 → 不重复自测提醒', () => {
    const ds: PatientChronicDisease[] = [
      { disease: 'diabetes', nextFollowupAt: at(10 * 24 * H).slice(0, 10), lastVitalsAt: at(-1 * H) },
    ];
    const r = buildPatientHealthReminders('p1', [], [], ds, NOW);
    expect(r.chronicCareReminders.find((x) => x.title === '今日自测提醒')).toBeUndefined();
    // 但随访 10 天后（>7 天）也不提醒
    expect(r.chronicCareReminders).toHaveLength(0);
  });
});
