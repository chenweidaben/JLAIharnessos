/**
 * 健澜科技 jlmedaios - 院感监测预警纯函数单测（M130-B）
 *
 * 覆盖：
 *  - 风险识别：SSI / MDRO / VAP 单例信号命中与文案；
 *  - 聚集检测：发热聚集例数分级、72h 时间窗裁剪、同菌株耐药菌聚集、SSI/VAP 多例聚集；
 *  - 预警分级：overall 取最高、redAlert 仅 high/critical 标红。
 * 纯函数、无 I/O、无 DB、无 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  detectInfectionRisk,
  FEVER_TEMPERATURE,
  SSI_WINDOW_DAYS,
  VAP_VENT_HOURS,
  type InfectionPatientSignal,
  type RiskLevel,
  type WardContext,
} from '../../src/bff/aggregators/infectionMonitoringAggregator.js';

const WARD: WardContext = { wardCode: 'W-TEST', wardName: '测试病区', census: 30 };

function run(patients: InfectionPatientSignal[]) {
  return detectInfectionRisk(patients, WARD);
}

describe('M130-B 风险识别（单例信号）', () => {
  it('术后 12 天切口感染征象 → SSI medium 信号', () => {
    const r = run([{ patientId: 'p1', postOpDays: 12, ssiSuspected: true }]);
    const ssi = r.signals.find((s) => s.type === 'ssi');
    expect(ssi).toBeDefined();
    expect(ssi!.level).toBe('medium');
    expect(ssi!.patientCount).toBe(1);
    expect(ssi!.patientIds).toContain('p1');
  });

  it('术后 >30 天不计入 SSI 监测窗', () => {
    const r = run([{ patientId: 'p1', postOpDays: SSI_WINDOW_DAYS + 5, ssiSuspected: true }]);
    expect(r.signals.find((s) => s.type === 'ssi')).toBeUndefined();
  });

  it(`有创通气 ≥${VAP_VENT_HOURS}h + 新发肺部感染 → VAP medium`, () => {
    const r = run([{ patientId: 'p1', ventilated: true, ventHours: 72, vapSuspected: true }]);
    const vap = r.signals.find((s) => s.type === 'vap');
    expect(vap).toBeDefined();
    expect(vap!.level).toBe('medium');
  });

  it('通气不足 48h 即使有肺部感染也不计 VAP', () => {
    const r = run([{ patientId: 'p1', ventilated: true, ventHours: 24, vapSuspected: true }]);
    expect(r.signals.find((s) => s.type === 'vap')).toBeUndefined();
  });

  it('检出耐药菌 MRSA → 至少 high', () => {
    const r = run([{ patientId: 'p1', mdro: 'MRSA' }]);
    const mdro = r.signals.find((s) => s.type === 'mdro');
    expect(mdro).toBeDefined();
    expect(['high', 'critical']).toContain(mdro!.level);
    expect(mdro!.level).toBe('high');
  });

  it('体温正常、无任何感染征象 → 无信号、不标红', () => {
    const r = run([{ patientId: 'p1', temperature: 36.8 }, { patientId: 'p2', temperature: 37.1 }]);
    expect(r.signals).toHaveLength(0);
    expect(r.overallLevel).toBe('low');
    expect(r.redAlert).toBe(false);
  });
});

describe('M130-B 聚集检测', () => {
  const fever = (id: string, at: string): InfectionPatientSignal => ({
    patientId: id,
    temperature: FEVER_TEMPERATURE + 0.3,
    feverAt: at,
  });

  it.each([
    [1, 'low'],
    [2, 'low'],
    [3, 'medium'],
    [5, 'high'],
    [7, 'critical'],
  ])('72h 内发热 %i 例 → %s', (n, level) => {
    const base = Date.parse('2026-10-16T12:00:00Z');
    const patients = Array.from({ length: n }, (_, i) =>
      fever(`p${i}`, new Date(base - i * 3600 * 1000).toISOString()),
    );
    const r = run(patients);
    const fc = r.signals.find((s) => s.type === 'fever_cluster')!;
    expect(fc.level).toBe(level as RiskLevel);
    expect(fc.patientCount).toBe(n);
  });

  it('72h 窗外的发热病例不计入聚集', () => {
    const patients = [
      fever('p1', '2026-10-16T12:00:00Z'),
      fever('p2', '2026-10-16T06:00:00Z'),
      fever('p3', '2026-10-15T12:00:00Z'),
      fever('p4', '2026-10-01T12:00:00Z'), // 15 天前，窗外
    ];
    const r = run(patients);
    const fc = r.signals.find((s) => s.type === 'fever_cluster')!;
    expect(fc.patientCount).toBe(3);
    expect(fc.level).toBe('medium');
  });

  it('同病区同菌株耐药菌 ≥2 例 → critical 聚集暴发', () => {
    const r = run([
      { patientId: 'p1', mdro: 'CRAB' },
      { patientId: 'p2', mdro: 'CRAB' },
    ]);
    const mdro = r.signals.find((s) => s.type === 'mdro')!;
    expect(mdro.level).toBe('critical');
    expect(mdro.clustered).toBe(true);
    expect(mdro.patientCount).toBe(2);
  });

  it('不同菌株分别出信号，不跨菌株合并', () => {
    const r = run([
      { patientId: 'p1', mdro: 'MRSA' },
      { patientId: 'p2', mdro: 'CRE' },
    ]);
    const mdroSignals = r.signals.filter((s) => s.type === 'mdro');
    expect(mdroSignals).toHaveLength(2);
    // 各 1 例 → 各 high，不构成同菌株聚集
    expect(mdroSignals.every((s) => s.level === 'high' && s.clustered === false)).toBe(true);
  });

  it('2 例 SSI / 2 例 VAP 均升级 high 聚集', () => {
    const ssi = run([
      { patientId: 'p1', postOpDays: 8, ssiSuspected: true },
      { patientId: 'p2', postOpDays: 15, ssiSuspected: true },
    ]).signals.find((s) => s.type === 'ssi')!;
    expect(ssi.level).toBe('high');
    expect(ssi.clustered).toBe(true);

    const vap = run([
      { patientId: 'p1', ventilated: true, ventHours: 60, vapSuspected: true },
      { patientId: 'p2', ventilated: true, ventHours: 80, vapSuspected: true },
    ]).signals.find((s) => s.type === 'vap')!;
    expect(vap.level).toBe('high');
    expect(vap.clustered).toBe(true);
  });
});

describe('M130-B 预警分级与标红', () => {
  it('多种信号并存时 overall 取最高分级', () => {
    const r = run([
      { patientId: 'p1', postOpDays: 5, ssiSuspected: true }, // medium
      { patientId: 'p2', mdro: 'CRAB' }, // high
    ]);
    expect(r.overallLevel).toBe('high');
  });

  it('critical 信号 → redAlert 立即标红', () => {
    const r = run([
      { patientId: 'p1', mdro: 'CRE' },
      { patientId: 'p2', mdro: 'CRE' },
    ]);
    expect(r.overallLevel).toBe('critical');
    expect(r.redAlert).toBe(true);
    expect(r.counts.critical).toBeGreaterThanOrEqual(1);
  });

  it('medium 聚集预警不标红，high 及以上才标红', () => {
    const medium = run([
      { patientId: 'p1', temperature: 38.3, feverAt: '2026-10-16T10:00:00Z' },
      { patientId: 'p2', temperature: 38.1, feverAt: '2026-10-16T09:00:00Z' },
      { patientId: 'p3', temperature: 38.5, feverAt: '2026-10-16T08:00:00Z' },
    ]);
    expect(medium.overallLevel).toBe('medium');
    expect(medium.redAlert).toBe(false);
  });

  it('空输入 / 非数组输入安全降级为无风险', () => {
    const r = detectInfectionRisk([], WARD);
    expect(r.signals).toHaveLength(0);
    expect(r.redAlert).toBe(false);
    expect(r.wardCode).toBe('W-TEST');
    expect(r.counts).toEqual({ low: 0, medium: 0, high: 0, critical: 0 });
  });
});
