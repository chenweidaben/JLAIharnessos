/**
 * 健澜AI原生医院操作系统OS - P2-4 护理 NQI 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  __resetStore, NqiError,
  reportFall, reportPressureUlcer, reportTubeDisplacement, reportRestraint,
  assessRestraint, releaseRestraint, listEvents, upsertStaffing, dashboard,
} from '../../src/bff/aggregators/nqiAggregator';

beforeEach(() => { __resetStore(); });

const BASE = { visitId: 'V1', patientId: 'P1', departmentId: 'D1', occurredAt: '2026-11-04T08:00:00Z' };

describe('P2-4 跌倒', () => {
  test('上报 fall + Morse 范围内', () => {
    const e = reportFall({ ...BASE, severity: 'mild', morseScore: 45, riskFactors: ['history-fall'] });
    expect(e.eventId).toMatch(/^NQI-F-/);
    expect(e.details.severity).toBe('mild');
  });
  test('severity 非法 → 400', () => {
    expect(() => reportFall({ ...BASE, severity: 'extreme' as any, morseScore: 45 })).toThrow(NqiError);
  });
  test('Morse 越界（130）→ 400', () => {
    expect(() => reportFall({ ...BASE, severity: 'mild', morseScore: 130 })).toThrow(/morseScore/);
  });
});

describe('P2-4 压疮', () => {
  test('上报 pressure-ulcer + Braden', () => {
    const e = reportPressureUlcer({ ...BASE, source: 'hospital', stage: 'II', bradenScore: 16 });
    expect(e.details.stage).toBe('II');
  });
  test('stage 非法 → 400', () => {
    expect(() => reportPressureUlcer({ ...BASE, source: 'hospital', stage: 'V' as any, bradenScore: 16 })).toThrow(/stage/);
  });
  test('Braden 越界（5）→ 400', () => {
    expect(() => reportPressureUlcer({ ...BASE, source: 'community', stage: 'I', bradenScore: 5 })).toThrow(/bradenScore/);
  });
});

describe('P2-4 管路滑脱', () => {
  test('上报 tube-displacement', () => {
    const e = reportTubeDisplacement({ ...BASE, catheterType: 'cvc', reason: 'accidental', reinserted: true, reinsertedAt: '2026-11-04T09:00:00Z' });
    expect(e.details.catheterType).toBe('cvc');
  });
  test('catheterType 非法 → 400', () => {
    expect(() => reportTubeDisplacement({ ...BASE, catheterType: 'pigtail' as any, reason: 'accidental', reinserted: false })).toThrow(/catheterType/);
  });
});

describe('P2-4 约束保护', () => {
  test('开始 + 每日评估 + 解除', () => {
    const r = reportRestraint({ ...BASE, restraintType: 'physical', appliedAt: '2026-11-04T08:00:00Z', rationale: '防拔管' });
    const a = assessRestraint(r.eventId, '2026-11-05T08:00:00Z', '患者仍躁动', ['家属陪伴', '镇静']);
    expect((a.details.dailyAssessments as unknown[]).length).toBe(1);
    const rel = releaseRestraint(r.eventId, '2026-11-06T08:00:00Z');
    expect(rel.details.removedAt).toBeTruthy();
  });
  test('解除后再 assess → 409', () => {
    const r = reportRestraint({ ...BASE, restraintType: 'physical', appliedAt: '2026-11-04T08:00:00Z', rationale: '防拔管' });
    releaseRestraint(r.eventId, '2026-11-05T08:00:00Z');
    expect(() => assessRestraint(r.eventId, '2026-11-06T08:00:00Z', 'x', [])).toThrow(NqiError);
  });
  test('重复解除 → 409', () => {
    const r = reportRestraint({ ...BASE, restraintType: 'chemical', appliedAt: '2026-11-04T08:00:00Z', rationale: 'y' });
    releaseRestraint(r.eventId, '2026-11-05T08:00:00Z');
    expect(() => releaseRestraint(r.eventId, '2026-11-06T08:00:00Z')).toThrow(/重复解除/);
  });
  test('rationale 空 → 400', () => {
    expect(() => reportRestraint({ ...BASE, restraintType: 'physical', appliedAt: 'x', rationale: '' })).toThrow(/rationale/);
  });
});

describe('P2-4 列表/看板/配比', () => {
  test('listEvents 按科室/类型过滤', () => {
    reportFall({ ...BASE, severity: 'mild', morseScore: 50 });
    reportPressureUlcer({ ...BASE, source: 'hospital', stage: 'I', bradenScore: 18 });
    const all = listEvents({});
    expect(all.length).toBe(2);
    expect(listEvents({ type: 'fall' }).length).toBe(1);
    expect(listEvents({ departmentId: 'NOPE' }).length).toBe(0);
  });
  test('staffing 录入 + dashboard 发生率', () => {
    upsertStaffing({ departmentId: 'D1', date: '2026-11-01', beds: 40, nurses: 10, inpatients: 40 });
    upsertStaffing({ departmentId: 'D1', date: '2026-11-02', beds: 40, nurses: 10, inpatients: 40 });
    reportFall({ ...BASE, occurredAt: '2026-11-02T10:00:00Z', severity: 'mild', morseScore: 50 });
    const d = dashboard('2026-11', 'D1');
    expect(d.totalInpatientDays).toBe(80);
    expect(d.fallCount).toBe(1);
    // 1/80*1000 = 12.5
    expect(d.fallRatePer1000).toBe(12.5);
    expect(d.ratios.bedNurse).toBe(4); // 80 beds / 20 nurses
  });
  test('month 格式非法 → 400', () => {
    expect(() => dashboard('11-2026')).toThrow(/YYYY-MM/);
  });
  test('staffing 缺 date → 400', () => {
    expect(() => upsertStaffing({ departmentId: 'D1', date: '', beds: 1, nurses: 1, inpatients: 1 })).toThrow(/date/);
  });
});
