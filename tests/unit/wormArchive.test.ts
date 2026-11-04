/**
 * 健澜AI原生医院操作系统OS - P5-2 WORM 归档 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import { __resetStore as resetAudit, recordEvent } from '../../src/bff/aggregators/auditEventAggregator';
import {
  __resetStore, __tamperSegment, getSegment, listSegments, seal, verify,
} from '../../src/bff/aggregators/wormArchiveAggregator';

beforeEach(() => { resetAudit(); __resetStore(); });

function seedN(n: number) {
  for (let i = 0; i < n; i++) {
    recordEvent({
      actorId: `D${i}`, actorRole: 'doctor', action: 'create', module: 'emr',
      resourceType: 'note', resourceId: `N${i}`, result: 'success',
      ip: '1.1.1.1', userAgent: 'ua',
    });
  }
}

describe('P5-2 seal 基础', () => {
  test('无事件 seal → no-events', () => {
    const r = seal({}, 'ADMIN');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('no-events');
  });
  test('非法 from → invalid-window', () => {
    seedN(3);
    const r = seal({ from: 'bad' }, 'ADMIN');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('invalid-window');
  });
  test('有事件 seal → 段生成，segmentHash 64 hex', () => {
    seedN(5);
    const r = seal({}, 'ADMIN');
    expect(r.ok).toBe(true);
    expect(r.segment!.segmentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(r.segment!.eventCount).toBe(5);
    expect(r.segment!.fromSeq).toBe(1);
    expect(r.segment!.toSeq).toBe(5);
  });
  test('首段 prevSegmentHash = GENESIS', () => {
    seedN(3);
    const r = seal({}, 'ADMIN');
    expect(r.segment!.prevSegmentHash).toBe('GENESIS');
  });
});

describe('P5-2 链式归档', () => {
  test('第二段 prevSegmentHash == 第一段 segmentHash', () => {
    seedN(3);
    const s1 = seal({}, 'ADMIN').segment!;
    seedN(2);  // 再产生 2 条
    const s2 = seal({}, 'ADMIN').segment!;
    expect(s2.prevSegmentHash).toBe(s1.segmentHash);
    expect(s2.seq).toBe(s1.seq + 1);
  });
  test('幂等：无新事件再 seal → no-events', () => {
    seedN(3);
    seal({}, 'ADMIN');
    const r2 = seal({}, 'ADMIN');
    expect(r2.ok).toBe(false);
    expect(r2.error).toBe('no-events');
  });
});

describe('P5-2 verify', () => {
  test('两段未篡改 → valid=true, segmentCount=2', () => {
    seedN(3); seal({}, 'ADMIN');
    seedN(2); seal({}, 'ADMIN');
    const v = verify();
    expect(v.valid).toBe(true);
    expect(v.segmentCount).toBe(2);
  });
  test('篡改首段后 verify valid=false + brokenSegmentId', () => {
    seedN(3); const s1 = seal({}, 'ADMIN').segment!;
    seedN(2); seal({}, 'ADMIN');
    __tamperSegment(s1.segmentId);
    const v = verify();
    expect(v.valid).toBe(false);
    expect(v.brokenSegmentId).toBe(s1.segmentId);
  });
  test('空段 verify → valid=true, segmentCount=0', () => {
    const v = verify();
    expect(v.valid).toBe(true);
    expect(v.segmentCount).toBe(0);
  });
});

describe('P5-2 查询', () => {
  test('listSegments 分页', () => {
    seedN(3); seal({}, 'ADMIN');
    seedN(2); seal({}, 'ADMIN');
    const r = listSegments(10, 0);
    expect(r.total).toBe(2);
    expect(r.rows.length).toBe(2);
  });
  test('getSegment 命中；不存在 → null', () => {
    seedN(3); const s = seal({}, 'ADMIN').segment!;
    expect(getSegment(s.segmentId)?.segmentId).toBe(s.segmentId);
    expect(getSegment('WORM-nope')).toBeNull();
  });
});
