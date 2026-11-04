/**
 * 健澜AI原生医院操作系统OS - P2-3 患者时间线 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import { __resetStore, listEvents, recordEvent, summarize, TimelineError } from '../../src/bff/aggregators/patientTimelineAggregator';

beforeEach(() => { __resetStore(); });

function seedN(patientId: string, n: number): void {
  for (let i = 0; i < n; i++) {
    recordEvent({
      patientId, visitId: `V${i}`, type: (['lab','imaging','medication','surgery','nursing','cds','encounter'] as const)[i % 7],
      time: `2026-11-${String((i % 28) + 1).padStart(2, '0')}T08:00:00Z`,
      summary: `event ${i}`, detailRef: `/ref/${i}`,
    });
  }
}

describe('P2-3 倒序/分页/过滤', () => {
  test('默认倒序：最新在前', () => {
    recordEvent({ patientId: 'P', visitId: 'V1', type: 'lab', time: '2026-11-01T08:00:00Z', summary: 'old', detailRef: '/r1' });
    recordEvent({ patientId: 'P', visitId: 'V2', type: 'lab', time: '2026-11-03T08:00:00Z', summary: 'new', detailRef: '/r2' });
    const r = listEvents({ patientId: 'P' });
    expect(r.events[0].summary).toBe('new');
    expect(r.events[1].summary).toBe('old');
  });
  test('type=lab 过滤只返 lab', () => {
    seedN('P', 14);
    const r = listEvents({ patientId: 'P', type: 'lab' });
    expect(r.events.every((e) => e.type === 'lab')).toBe(true);
    expect(r.total).toBe(2);
  });
  test('from/to 时间范围过滤', () => {
    seedN('P', 14);
    const r = listEvents({ patientId: 'P', from: '2026-11-02T00:00:00Z', to: '2026-11-05T23:59:59Z' });
    expect(r.total).toBeGreaterThan(0);
    expect(r.events.every((e) => e.time >= '2026-11-02' && e.time <= '2026-11-05T23:59:59Z')).toBe(true);
  });
  test('分页 limit=10 offset=10', () => {
    seedN('P', 30);
    const page1 = listEvents({ patientId: 'P', limit: 10, offset: 0 });
    const page2 = listEvents({ patientId: 'P', limit: 10, offset: 10 });
    expect(page1.events.length).toBe(10);
    expect(page2.events.length).toBe(10);
    expect(page1.total).toBe(30);
    // 不重叠
    const ids1 = new Set(page1.events.map((e) => e.eventId));
    expect(page2.events.every((e) => !ids1.has(e.eventId))).toBe(true);
  });
  test('limit>200 → 400', () => {
    expect(() => listEvents({ patientId: 'P', limit: 201 })).toThrow(TimelineError);
    try { listEvents({ patientId: 'P', limit: 201 }); } catch (e) { expect((e as TimelineError).status).toBe(400); }
  });
  test('非法 type → 400', () => {
    expect(() => listEvents({ patientId: 'P', type: 'unknown' })).toThrow(/非法 type/);
  });
  test('非法 from → 400', () => {
    expect(() => listEvents({ patientId: 'P', from: 'not-a-date' })).toThrow(/非法 from/);
  });
  test('非法 to → 400', () => {
    expect(() => listEvents({ patientId: 'P', to: 'not-a-date' })).toThrow(/非法 to/);
  });
  test('patientId 必填 → 400', () => {
    expect(() => listEvents({ patientId: '' })).toThrow(/patientId 必填/);
  });
  test('空结果返 []', () => {
    const r = listEvents({ patientId: 'NOBODY' });
    expect(r.events).toEqual([]);
    expect(r.total).toBe(0);
  });
});

describe('P2-3 summary', () => {
  test('byType 计数 + timeRange', () => {
    seedN('P', 14);
    const s = summarize('P');
    expect(s.totalEvents).toBe(14);
    expect(s.byType.lab).toBe(2);
    expect(s.byType.medication).toBe(2);
    expect(s.timeRange.earliest).toBeTruthy();
    expect(s.timeRange.latest).toBeTruthy();
  });
  test('空患者 summary byType 全 0', () => {
    const s = summarize('NOBODY');
    expect(s.totalEvents).toBe(0);
    expect(s.byType.lab).toBe(0);
    expect(s.timeRange.earliest).toBeNull();
  });
});
