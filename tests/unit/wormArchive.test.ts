/**
 * 健澜AI原生医院操作系统OS - P5-2 WORM 归档 单测（影子探针版）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import { __resetStore as resetAudit, recordEvent } from '../../src/bff/aggregators/auditEventAggregator';
import {
  __resetStore, createProbe, getSegment, listSegments, resetProbes, seal, verify,
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
    const r = seal({});
    expect(r.ok).toBe(false);
    expect(r.error).toBe('no-events');
  });
  test('非法 from → invalid-window', () => {
    seedN(3);
    const r = seal({ from: 'bad' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('invalid-window');
  });
  test('有事件 seal → 段生成，segmentHash 64 hex', () => {
    seedN(5);
    const r = seal({});
    expect(r.ok).toBe(true);
    expect(r.segment!.segmentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(r.segment!.eventCount).toBe(5);
  });
  test('首段 prevSegmentHash = GENESIS', () => {
    seedN(3);
    const r = seal({});
    expect(r.segment!.prevSegmentHash).toBe('GENESIS');
  });
});

describe('P5-2 链式归档', () => {
  test('第二段 prevSegmentHash == 第一段 segmentHash', () => {
    seedN(3);
    const s1 = seal({}).segment!;
    seedN(2);
    const s2 = seal({}).segment!;
    expect(s2.prevSegmentHash).toBe(s1.segmentHash);
  });
  test('幂等：无新事件再 seal → no-events', () => {
    seedN(3);
    seal({});
    expect(seal({}).ok).toBe(false);
  });
});

describe('P5-2 真实段链', () => {
  test('两段未篡改 → verify realChainValid=true', () => {
    seedN(3); seal({});
    seedN(2); seal({});
    const v = verify('real');
    expect(v.realChainValid).toBe(true);
    expect(v.valid).toBe(true);
    expect(v.segmentCount).toBe(2);
  });
  test('真实段 verify?scope=real → valid=true（即使有探针）', () => {
    seedN(3); const s1 = seal({}).segment!;
    createProbe(s1.segmentId);
    const v = verify('real');
    expect(v.realChainValid).toBe(true);
    expect(v.valid).toBe(true);
  });
});

describe('P5-2 影子探针', () => {
  test('_tamper 后真实段未被污染：首段 prevSegmentHash 仍 GENESIS', () => {
    seedN(3); const s1 = seal({}).segment!;
    createProbe(s1.segmentId);
    const after = getSegment(s1.segmentId)!;
    expect(after.prevSegmentHash).toBe('GENESIS');
    expect(after.segmentHash).toBe(s1.segmentHash);
  });
  test('verify 默认 → valid=false 且 brokenSegmentId=probeId', () => {
    seedN(3); const s1 = seal({}).segment!;
    const probe = createProbe(s1.segmentId)!;
    const v = verify('all');
    expect(v.realChainValid).toBe(true);     // 真实段好的
    expect(v.probeBroken).toBe(true);        // 探针坏了
    expect(v.valid).toBe(false);
    expect(v.brokenSegmentId).toBe(probe.probeId);
    expect(v.brokenScope).toBe('probe');
  });
  test('_probes/reset 后 verify 恢复 valid=true', () => {
    seedN(3); const s1 = seal({}).segment!;
    createProbe(s1.segmentId);
    expect(verify('all').valid).toBe(false);
    resetProbes();
    const v = verify('all');
    expect(v.valid).toBe(true);
    expect(v.probeBroken).toBe(false);
  });
});

describe('P5-2 查询', () => {
  test('listSegments 分页', () => {
    seedN(3); seal({});
    seedN(2); seal({});
    expect(listSegments(10, 0).total).toBe(2);
  });
  test('getSegment 命中；不存在 → null', () => {
    seedN(3); const s = seal({}).segment!;
    expect(getSegment(s.segmentId)?.segmentId).toBe(s.segmentId);
    expect(getSegment('WORM-nope')).toBeNull();
  });
});
