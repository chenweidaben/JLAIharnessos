/**
 * 健澜科技 jlmedaios - 医院感染控制纯函数单测（M141-D）
 *
 * 覆盖：
 *  - 事件上报 reportInfection：落账结构、首例不预警、同科室同类型 24h 内第二例自动预警；
 *  - 传播追踪 trackInfectionSpread / detectSpreadInEvents：≥2 例出预警、按类型分组、
 *    时间窗裁剪、不同科室/不同类型不合并；
 *  - 月报生成 generateInfectionReport / buildReportFromEvents：账期切片、四类指标率值、
 *    科室分布。
 * 纯函数、无 I/O、无 DB、无 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it, beforeEach } from 'bun:test';
import {
  __resetInfectionEvents,
  buildReportFromEvents,
  DEFAULT_MONTHLY_DENOMINATOR,
  detectSpreadInEvents,
  evaluateAutoAlert,
  generateInfectionReport,
  listInfectionEvents,
  reportInfection,
  SPREAD_THRESHOLD,
  trackInfectionSpread,
  TYPE_LABEL,
  type InfectionEvent,
  type InfectionType,
} from '../../src/bff/aggregators/infectionControlAggregator.js';

beforeEach(() => {
  __resetInfectionEvents();
});

/** 构造带可控时间的事件（纯逻辑层用） */
function makeEvent(
  id: string,
  patientId: string,
  dept: string,
  type: InfectionType,
  reportedAt: string,
): InfectionEvent {
  return { id, patientId, dept, type, source: 'nurse', reportedAt, autoAlert: false };
}

describe('M141-D 事件上报 reportInfection', () => {
  it('落账事件结构完整，首例不触发自动预警', () => {
    const ev = reportInfection('p-1', '重症医学科', 'vap', 'nurse');
    expect(ev.id).toBeTruthy();
    expect(ev.patientId).toBe('p-1');
    expect(ev.dept).toBe('重症医学科');
    expect(ev.type).toBe('vap');
    expect(ev.source).toBe('nurse');
    expect(ev.reportedAt).toBeTruthy();
    // 首例：同科室同类型仅 1 例 → 不预警
    expect(ev.autoAlert).toBe(false);
    expect(listInfectionEvents()).toHaveLength(1);
  });

  it('【质量与安全】同科室同类型 24h 内第二例 → 自动预警 autoAlert=true', () => {
    reportInfection('p-1', '重症医学科', 'vap', 'nurse');
    const second = reportInfection('p-2', '重症医学科', 'vap', 'doctor');
    // 【核心】实时预警：不等暴发，第二例即标红
    expect(second.autoAlert).toBe(true);
  });

  it('不同科室同类型不互相触发预警', () => {
    reportInfection('p-1', '呼吸内科', 'mdro', 'microbiology');
    const ev = reportInfection('p-2', '普外科', 'mdro', 'microbiology');
    expect(ev.autoAlert).toBe(false);
  });

  it('同科室不同类型不互相触发预警', () => {
    reportInfection('p-1', '重症医学科', 'vap', 'nurse');
    const ev = reportInfection('p-2', '重症医学科', 'ssi', 'doctor');
    expect(ev.autoAlert).toBe(false);
  });
});

describe('M141-D 传播追踪 trackInfectionSpread', () => {
  it('纯逻辑：同科室同类型窗内 ≥2 例 → 出聚集预警', () => {
    const events = [
      makeEvent('e1', 'p1', '呼吸内科', 'mdro', '2026-10-16T08:00:00Z'),
      makeEvent('e2', 'p2', '呼吸内科', 'mdro', '2026-10-16T10:00:00Z'),
    ];
    const alerts = detectSpreadInEvents(events, '呼吸内科', 7, '2026-10-16T12:00:00Z');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('mdro');
    expect(alerts[0].count).toBe(2);
    expect(alerts[0].patientIds).toEqual(['p1', 'p2']);
    expect(alerts[0].windowHours).toBe(7 * 24);
    expect(alerts[0].message).toContain('院感科');
  });

  it('窗内仅 1 例 → 不出聚集预警', () => {
    const events = [makeEvent('e1', 'p1', '普外科', 'ssi', '2026-10-16T08:00:00Z')];
    const alerts = detectSpreadInEvents(events, '普外科', 7, '2026-10-16T12:00:00Z');
    expect(alerts).toHaveLength(0);
  });

  it('不同类型分别出预警，不跨类型合并', () => {
    const events = [
      makeEvent('e1', 'p1', 'ICU', 'vap', '2026-10-16T08:00:00Z'),
      makeEvent('e2', 'p2', 'ICU', 'vap', '2026-10-16T09:00:00Z'),
      makeEvent('e3', 'p3', 'ICU', 'ssi', '2026-10-16T08:30:00Z'),
      makeEvent('e4', 'p4', 'ICU', 'ssi', '2026-10-16T09:30:00Z'),
    ];
    const alerts = detectSpreadInEvents(events, 'ICU', 7, '2026-10-16T12:00:00Z');
    expect(alerts).toHaveLength(2);
    expect(alerts.map((a) => a.type).sort()).toEqual(['ssi', 'vap']);
  });

  it('窗外事件不计入聚集窗', () => {
    const events = [
      makeEvent('e1', 'p1', '呼吸内科', 'mdro', '2026-09-01T08:00:00Z'), // 45 天前
      makeEvent('e2', 'p2', '呼吸内科', 'mdro', '2026-10-16T10:00:00Z'),
    ];
    const alerts = detectSpreadInEvents(events, '呼吸内科', 7, '2026-10-16T12:00:00Z');
    expect(alerts).toHaveLength(0);
  });

  it('入口函数 trackInfectionSpread 基于进程日志工作', () => {
    reportInfection('p1', '普外科', 'ssi', 'doctor');
    reportInfection('p2', '普外科', 'ssi', 'doctor');
    const alerts = trackInfectionSpread('普外科', 1);
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(alerts[0].type).toBe('ssi');
  });

  it('evaluateAutoAlert：窗内已有 1 例 → 新例触发；窗外不触发', () => {
    const existing = [makeEvent('e1', 'p1', 'ICU', 'vap', '2026-10-16T08:00:00Z')];
    expect(
      evaluateAutoAlert(existing, { dept: 'ICU', type: 'vap', reportedAt: '2026-10-16T09:00:00Z' }),
    ).toBe(true);
    expect(
      evaluateAutoAlert(existing, { dept: 'ICU', type: 'vap', reportedAt: '2026-10-20T09:00:00Z' }),
    ).toBe(false);
    expect(SPREAD_THRESHOLD).toBe(2);
  });
});

describe('M141-D 月报生成 generateInfectionReport', () => {
  it('账期切片 + 四类指标率值计算', () => {
    // 2026-10：2 例 ssi、1 例 vap
    reportInfection('p1', '普外科', 'ssi', 'doctor');
    reportInfection('p2', '普外科', 'ssi', 'doctor');
    reportInfection('p3', 'ICU', 'vap', 'nurse');
    // 2026-09：1 例 mdro（不应计入 10 月）
    const sep = buildReportFromEvents(
      [makeEvent('old', 'p9', '呼吸内科', 'mdro', '2026-09-15T08:00:00Z')],
      '2026-09',
    );
    expect(sep.totalEvents).toBe(1);
    expect(sep.metrics.find((m) => m.type === 'mdro')!.cases).toBe(1);

    const rep = generateInfectionReport('2026-10');
    expect(rep.period).toBe('2026-10');
    expect(rep.totalEvents).toBe(3);
    expect(rep.metrics).toHaveLength(4);

    const ssi = rep.metrics.find((m) => m.type === 'ssi')!;
    expect(ssi.label).toBe(TYPE_LABEL.ssi);
    expect(ssi.cases).toBe(2);
    // rate = 2 / 200 * 100 = 1.0（每百台手术）
    expect(ssi.rate).toBe(Number(((2 / DEFAULT_MONTHLY_DENOMINATOR.ssi) * 100).toFixed(2)));

    const vap = rep.metrics.find((m) => m.type === 'vap')!;
    expect(vap.cases).toBe(1);
    expect(vap.unit).toBe('每千通气日');

    // mdro 本月 0 例 → 率 0
    expect(rep.metrics.find((m) => m.type === 'mdro')!.cases).toBe(0);
  });

  it('科室分布按例数降序', () => {
    reportInfection('p1', '普外科', 'ssi', 'doctor');
    reportInfection('p2', '普外科', 'ssi', 'doctor');
    reportInfection('p3', 'ICU', 'vap', 'nurse');
    const rep = generateInfectionReport('2026-10');
    expect(rep.deptBreakdown[0].dept).toBe('普外科');
    expect(rep.deptBreakdown[0].cases).toBe(2);
  });

  it('本期出现聚集 → 月报 alerts 非空', () => {
    reportInfection('p1', '呼吸内科', 'mdro', 'microbiology');
    reportInfection('p2', '呼吸内科', 'mdro', 'microbiology');
    const rep = generateInfectionReport('2026-10');
    expect(rep.alerts.length).toBeGreaterThanOrEqual(1);
  });

  it('空事件集 / 未知账期安全降级', () => {
    const rep = generateInfectionReport('2030-01');
    expect(rep.totalEvents).toBe(0);
    expect(rep.metrics.every((m) => m.cases === 0 && m.rate === 0)).toBe(true);
    expect(rep.alerts).toHaveLength(0);
  });
});
