/**
 * 健澜AI原生医院操作系统OS - P5-2/P5-4 WORM 归档 单测（国密硬化版）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import { rmSync } from 'node:fs';
import { __resetStore as resetAudit, recordEvent } from '../../src/bff/aggregators/auditEventAggregator';
import {
  __counters, __getCipherHex, __resetStore, __sm3StandardVector, checkSeqContinuity,
  createProbe, getSegment, getSegmentEvents, keyStatus, listSegments, resetProbes,
  seal, sm2Verify, storeInfo, tamperProbeDigest, tamperProbeSignature, verify,
} from '../../src/bff/aggregators/wormArchiveAggregator';
import { FileWormStore, __resetWormStore, isValidSegmentId } from '../../src/bff/aggregators/wormStore';
import { getAutoConfig, listTickHistory, rebuildIndex, search, setAutoConfig, tick, __resetDecryptCache, __resetIndexCache, __resetTickHistory } from '../../src/bff/aggregators/wormAuto';

beforeEach(() => { resetAudit(); __resetStore(); resetProbes(); });

function seedN(n: number): string[] {
  const actions: string[] = [];
  for (let i = 0; i < n; i++) {
    const act = 'create'; // 用合法 action；密文断言不依赖具体 action 字符串
    actions.push(act);
    recordEvent({
      actorId: `D${i}-${Math.random().toString(36).slice(2, 6)}`,
      actorRole: 'doctor', action: act, module: 'emr',
      resourceType: 'note', resourceId: `N${i}-${Math.random().toString(36).slice(2, 6)}`,
      result: 'success',
      ip: '1.1.1.1', userAgent: 'ua',
    });
  }
  return actions;
}

describe('P5-2 seal 基础（回归）', () => {
  test('无事件 seal → no-events', () => {
    expect(seal({}).ok).toBe(false);
  });
  test('首段 prevSegmentHash = GENESIS', () => {
    seedN(3);
    const r = seal({});
    expect(r.ok).toBe(true);
    expect(r.segment!.prevSegmentHash).toBe('GENESIS');
  });
  test('第二段 prev == 第一段 hash', () => {
    seedN(3); const s1 = seal({}).segment!;
    seedN(2); const s2 = seal({}).segment!;
    expect(s2.prevSegmentHash).toBe(s1.segmentHash);
  });
  test('幂等：无新事件再 seal → no-events', () => {
    seedN(3); seal({});
    expect(seal({}).ok).toBe(false);
  });
});

describe('P5-4 SM3 摘要', () => {
  test('SM3 标准向量：sm3("abc") === 66c7f0f4...ba8e0', () => {
    expect(__sm3StandardVector()).toBe('66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0');
  });
  test('段字段含 digestAlg=SM3 与 digestSm3 64 hex', () => {
    seedN(3);
    const r = seal({});
    expect(r.segment!.digestAlg).toBe('SM3');
    expect(r.segment!.digestSm3).toMatch(/^[0-9a-f]{64}$/);
  });
  test('SM3 稳定：同输入同摘要（重算一致）', () => {
    seedN(3);
    const r = seal({});
    const seg = getSegment(r.segment!.segmentId)!;
    expect(seg.digestSm3).toBe(r.segment!.digestSm3);
  });
});

describe('P5-4 SM4 加密', () => {
  test('段字段含 sm4Encrypted=true、iv、cipherBytes', () => {
    seedN(3);
    const r = seal({});
    expect(r.segment!.sm4Encrypted).toBe(true);
    expect(r.segment!.iv).toMatch(/^[0-9a-f]{32}$/);
    expect(r.segment!.cipherBytes.length).toBeGreaterThan(0);
  });
  test('密文不含明文 actorId 关键词（核心安全断言）', () => {
    seedN(3);
    const r = seal({});
    const cipherHex = __getCipherHex(r.segment!.segmentId)!;
    // 取该段所有 events，验证每个 actorId 都不在密文 hex 中
    const evts = getSegmentEvents(r.segment!.segmentId)!;
    for (const e of evts) {
      const actorHex = Buffer.from(e.actorId, 'utf8').toString('hex');
      expect(cipherHex.toLowerCase()).not.toContain(actorHex.toLowerCase());
    }
  });
  test('content 端点解密往返：明文与原 events 一致', () => {
    seedN(3);
    const r = seal({});
    const evts = getSegmentEvents(r.segment!.segmentId)!;
    expect(evts.length).toBe(3);
    expect(evts[0].action).toBe('create');
  });
});

describe('P5-4 SM2 签名', () => {
  test('段字段含 sm2Signature 与 signerKeyId', () => {
    seedN(3);
    const r = seal({});
    expect(r.segment!.sm2Signature.length).toBeGreaterThan(0);
    expect(r.segment!.signerKeyId).toBeTruthy();
  });
  test('正常段 sm2Verify(digestSm3, signature) = true', () => {
    seedN(3);
    const r = seal({});
    expect(sm2Verify(r.segment!.digestSm3, r.segment!.sm2Signature)).toBe(true);
  });
  test('篡改 digestSm3 后 sm2Verify = false', () => {
    seedN(3);
    const r = seal({});
    // 用一个假的 64 hex digest
    const fakeDigest = '0'.repeat(64);
    expect(sm2Verify(fakeDigest, r.segment!.sm2Signature)).toBe(false);
  });
  test('keyStatus 不泄露私钥字段，返 hex 公钥', () => {
    const s = keyStatus();
    expect(s.signerKeyId).toBeTruthy();
    // SM2 公钥 130 hex（04+x+y）
    expect(s.publicKeyHex).toMatch(/^04[0-9a-f]{128}$/);
    expect(JSON.stringify(s)).not.toContain('PRIVATE KEY');
    expect(JSON.stringify(s)).not.toContain('privateKey');
  });
});

describe('P5-4 verify 扩展字段', () => {
  test('未篡改段 verify → digestValid=true signatureValid=true', () => {
    seedN(3); seal({});
    const v = verify('real');
    expect(v.realChainValid).toBe(true);
    expect(v.digestValid).toBe(true);
    expect(v.signatureValid).toBe(true);
    expect(v.segments.length).toBe(1);
    expect(v.segments[0].digestValid).toBe(true);
  });
  test('_tamper-digest 后 verify all → brokenScope=probe', () => {
    seedN(3); const s1 = seal({}).segment!;
    const probe = createProbe(s1.segmentId)!;
    tamperProbeDigest(probe.probeId);
    const v = verify('all');
    expect(v.valid).toBe(false);
    expect(v.brokenScope).toBe('probe');
  });
  test('_tamper-signature 后 verify all → brokenScope=probe', () => {
    seedN(3); const s1 = seal({}).segment!;
    const probe = createProbe(s1.segmentId)!;
    tamperProbeSignature(probe.probeId);
    const v = verify('all');
    expect(v.valid).toBe(false);
    expect(v.brokenScope).toBe('probe');
  });
  test('_probes/reset 后 verify 恢复 valid=true', () => {
    seedN(3); const s1 = seal({}).segment!;
    const probe = createProbe(s1.segmentId)!;
    tamperProbeDigest(probe.probeId);
    expect(verify('all').valid).toBe(false);
    resetProbes();
    expect(verify('all').valid).toBe(true);
  });
  test('真实段未被 _tamper-digest 污染（verify?scope=real 仍 valid）', () => {
    seedN(3); const s1 = seal({}).segment!;
    const probe = createProbe(s1.segmentId)!;
    tamperProbeDigest(probe.probeId);
    tamperProbeSignature(probe.probeId);
    const v = verify('real');
    expect(v.realChainValid).toBe(true);
    expect(v.digestValid).toBe(true);
    expect(v.signatureValid).toBe(true);
  });
});

describe('P5-4 查询', () => {
  test('listSegments 分页', () => {
    seedN(3); seal({});
    seedN(2); seal({});
    expect(listSegments(10, 0).total).toBe(2);
  });
});

describe('P5-5 路径穿越防护', () => {
  test('合法 segmentId 通过', () => {
    expect(isValidSegmentId('WORM-0001-abc123')).toBe(true);
    expect(isValidSegmentId('VERIFY-PROBE-1-xyz')).toBe(true);
  });
  test('恶意串被拒（3 例）', () => {
    expect(isValidSegmentId('../../etc/passwd')).toBe(false);
    expect(isValidSegmentId('..\\..\\win.ini')).toBe(false);
    expect(isValidSegmentId('WORM-0001-x/../../y')).toBe(false);
  });
  test('getSegment 对非法 id 返 null（不抛）', () => {
    expect(getSegment('../../etc/passwd')).toBeNull();
  });
});

describe('P5-5 FileWormStore', () => {
  test('put → get 往返 + 新实例同目录读回（等价重启不丢）', () => {
    const dir = `logs/worm-store-test-${Math.random().toString(36).slice(2)}`;
    const s1 = new FileWormStore(dir);
    const fake = {
      segmentId: 'WORM-9999-test', seq: 1, fromSeq: 1, toSeq: 1, eventCount: 1,
      segmentHash: 'a'.repeat(64), prevSegmentHash: 'GENESIS', sourceChainHead: 'b'.repeat(64),
      sourceChainValid: true, sealedAt: new Date().toISOString(), bytes: 10,
      digestAlg: 'SM3', digestSm3: 'c'.repeat(64), sm4Encrypted: true, iv: 'd'.repeat(32),
      cipherBytes: 'ef', sm2Signature: 'f'.repeat(128), signerKeyId: 'x', keySource: 'demo-ephemeral',
    } as const;
    s1.put(fake as never);
    // 新实例读同目录
    const s2 = new FileWormStore(dir);
    const got = s2.get('WORM-9999-test');
    expect(got?.segmentId).toBe('WORM-9999-test');
    expect(got?.digestSm3).toBe('c'.repeat(64));
    expect(s2.count()).toBe(1);
    // 重复 put → duplicate
    expect(() => s1.put(fake as never)).toThrow(/duplicate/);
  });
});

describe('P5-5 seqContinuity', () => {
  test('正常无缝 → valid=true', () => {
    seedN(3); seal({});
    seedN(3); seal({});
    const v = verify('real');
    expect(v.seqContinuity.valid).toBe(true);
    expect(v.seqContinuity.gaps.length).toBe(0);
  });
  test('人为构造 toSeq 跳号 → gaps 非空', () => {
    const segs = [
      { segmentId: 'WORM-1-a', seq: 1, fromSeq: 1, toSeq: 3 },
      { segmentId: 'WORM-2-b', seq: 2, fromSeq: 10, toSeq: 12 },
    ] as never[];
    const c = checkSeqContinuity(segs as never);
    expect(c.valid).toBe(false);
    expect(c.gaps.length).toBeGreaterThan(0);
  });
  test('seq 重复 → duplicateSeq 非空', () => {
    const segs = [
      { segmentId: 'WORM-1-a', seq: 1, fromSeq: 1, toSeq: 3 },
      { segmentId: 'WORM-2-b', seq: 2, fromSeq: 1, toSeq: 3 },
    ] as never[];
    const c = checkSeqContinuity(segs as never);
    expect(c.valid).toBe(false);
    expect(c.duplicateSeq.length).toBeGreaterThan(0);
  });
  test('首段 fromSeq≠1 → startGap 记录但不判 fail', () => {
    const segs = [
      { segmentId: 'WORM-1-a', seq: 1, fromSeq: 5, toSeq: 7 },
    ] as never[];
    const c = checkSeqContinuity(segs as never);
    expect(c.startGap).toEqual({ expected: 1, actual: 5 });
    // 单段不构成 gap，valid=true
    expect(c.valid).toBe(true);
  });
});

describe('P5-5 storeInfo', () => {
  test('storeInfo 返 kind 与 segmentCount', () => {
    seedN(3); seal({});
    const s = storeInfo();
    expect(s.kind).toBe('memory');
    expect(s.segmentCount).toBe(1);
    expect(s.oldestSeq).toBe(1);
  });
});

describe('P5-5 fs 后端重启后计数器回填', () => {
  function mkSeg(segmentId: string, seq: number, fromSeq: number, toSeq: number): never {
    return {
      segmentId, seq, fromSeq, toSeq, eventCount: toSeq - fromSeq + 1,
      segmentHash: 'b'.repeat(64), prevSegmentHash: 'GENESIS', sourceChainHead: 'c'.repeat(64),
      sourceChainValid: true, sealedAt: new Date().toISOString(), bytes: 10,
      digestAlg: 'SM3', digestSm3: 'd'.repeat(64), sm4Encrypted: true, iv: 'e'.repeat(32),
      cipherBytes: 'ff', sm2Signature: 'a'.repeat(128), signerKeyId: 'x', keySource: 'demo-ephemeral',
    } as never;
  }

  test('磁盘已有段 → 重启后 seq 续写、不重复归档', () => {
    const dir = `logs/worm-store-restart-${Math.random().toString(36).slice(2)}`;
    const prevBackend = process.env.WORM_BACKEND;
    const prevDir = process.env.WORM_STORE_DIR;
    try {
      process.env.WORM_BACKEND = 'fs';
      process.env.WORM_STORE_DIR = dir;
      __resetWormStore();
      __resetStore();
      resetProbes();

      // 模拟上一进程留下的两段：事件 1..2、3..4
      const seeded = new FileWormStore(dir);
      seeded.put(mkSeg('WORM-0001-seed1', 1, 1, 2));
      seeded.put(mkSeg('WORM-0002-seed2', 2, 3, 4));

      // 重启后进程内计数器归零
      expect(__counters()).toEqual({ segmentCounter: 0, lastArchivedSeq: 0 });

      seedN(6); // 新进程事件流重新从 1 开始，1..4 已归档过
      const r = seal({});
      expect(r.ok).toBe(true);
      expect(r.segment!.seq).toBe(3);          // 续写 seq，而不是回到 1 撞车
      expect(r.segment!.fromSeq).toBe(5);      // 已归档到 4，不重复封存
      expect(r.segment!.prevSegmentHash).toBe('b'.repeat(64)); // 链接磁盘末段
      expect(__counters()).toEqual({ segmentCounter: 3, lastArchivedSeq: 6 });
    } finally {
      if (prevBackend === undefined) delete process.env.WORM_BACKEND;
      else process.env.WORM_BACKEND = prevBackend;
      if (prevDir === undefined) delete process.env.WORM_STORE_DIR;
      else process.env.WORM_STORE_DIR = prevDir;
      __resetWormStore();
      __resetStore();
      resetProbes();
      try { rmSync(dir, { recursive: true, force: true }); } catch { /* 只读属性残留可忽略 */ }
    }
  });
});

describe('P5-6 自动调度 + 检索', () => {
  beforeEach(() => {
    __resetDecryptCache();
    __resetIndexCache();
    // 清理 _auto.json，避免上一个用例的 enabled:true 污染下一个
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('node:fs') as typeof import('node:fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('node:path') as typeof import('node:path');
      const dir = process.env.WORM_STORE_DIR ?? path.join('logs', 'worm-store');
      const p = path.join(dir, '_auto.json');
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch { /* 忽略 */ }
  });
  test('getAutoConfig 默认值', () => {
    const c = getAutoConfig();
    expect(c.enabled).toBe(false);
    expect(c.intervalMs).toBeGreaterThan(0);
  });
  test('setAutoConfig 持久化', () => {
    const c = setAutoConfig({ enabled: true, intervalMs: 60000, threshold: 5 });
    expect(c.enabled).toBe(true);
    expect(c.intervalMs).toBe(60000);
    expect(getAutoConfig().intervalMs).toBe(60000);
  });
  test('tick 无事件 → sealed=false（disabled 或 no-events）', () => {
    setAutoConfig({ enabled: true, intervalMs: 1, threshold: 1 });
    const r = tick();
    expect(r.sealed).toBe(false);
    expect(['no-events', 'disabled', 'below-threshold']).toContain(r.reason ?? '');
  });
  test('search 返回分页结构', () => {
    const r = search({ limit: 50 });
    expect(Array.isArray(r.rows)).toBe(true);
    expect(typeof r.total).toBe('number');
    expect(typeof r.scannedSegments).toBe('number');
  });
  test('部分更新不清空其它配置字段（undefined 不得覆盖）', () => {
    setAutoConfig({ enabled: true, intervalMs: 60000, threshold: 5 });
    const c = setAutoConfig({ intervalMs: 30000 } as Partial<{ intervalMs: number }>);
    expect(c.enabled).toBe(true);      // 未被 undefined 清空
    expect(c.threshold).toBe(5);       // 保持原值
    expect(c.intervalMs).toBe(30000);
    expect(getAutoConfig().enabled).toBe(true);
  });
  test('配置越界值被夹紧（intervalMs<threshold 非法）', () => {
    const c = setAutoConfig({ intervalMs: 10, threshold: 0 });
    expect(c.intervalMs).toBeGreaterThanOrEqual(1000);
    expect(c.threshold).toBeGreaterThanOrEqual(1);
  });
  test('时间窗触发：间隔已到即使未到阈值也封段', () => {
    recordEvent({
      actorId: 'A-TICK', actorRole: 'doctor', action: 'create', module: 'emr',
      resourceType: 'note', resourceId: 'N-TICK', result: 'success',
      ip: '1.1.1.1', userAgent: 'ua',
    });
    const twoHoursAgo = new Date(Date.now() - 2 * 3600_000).toISOString();
    setAutoConfig({ enabled: true, intervalMs: 60_000, threshold: 20, lastSealAt: twoHoursAgo });
    const r = tick();
    expect(r.sealed).toBe(true);
    expect(typeof r.segmentId).toBe('string');
  });
  test('interval 未到且未到阈值 → 不封段', () => {
    recordEvent({
      actorId: 'A-TICK2', actorRole: 'doctor', action: 'create', module: 'emr',
      resourceType: 'note', resourceId: 'N-TICK2', result: 'success',
      ip: '1.1.1.1', userAgent: 'ua',
    });
    setAutoConfig({ enabled: true, intervalMs: 3600_000, threshold: 50, lastSealAt: new Date().toISOString() });
    const r = tick();
    expect(r.sealed).toBe(false);
    expect(r.reason).toBe('below-threshold');
  });
  test('limit 非法（NaN/负数/0）回退默认且不返回空页', () => {
    seedN(3);
    seal({});
    for (const bad of [Number.NaN, -5, 0]) {
      const r = search({ limit: bad });
      expect(r.total).toBe(3);
      expect(r.rows.length).toBe(3);       // 回退默认 50，而不是 slice(NaN) 空页
    }
    const capped = search({ limit: 100000 });
    expect(capped.rows.length).toBeLessThanOrEqual(500);
  });
});

describe('P5-7 tick 落审计 + 检索性能', () => {
  beforeEach(() => {
    __resetDecryptCache();
    __resetIndexCache();
    __resetTickHistory();
    try {
      const fs = require('node:fs') as typeof import('node:fs');
      const path = require('node:path') as typeof import('node:path');
      const dir = process.env.WORM_STORE_DIR ?? path.join('logs', 'worm-store');
      for (const f of ['_auto.json', '_history.json', '_index.json']) {
        const p = path.join(dir, f);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    } catch { /* 忽略 */ }
  });

  test('tick 5 次 → history total=5，8 字段齐全、at 递增', () => {
    setAutoConfig({ enabled: false });
    for (let i = 0; i < 5; i++) tick();
    const h = listTickHistory(50, 0);
    expect(h.total).toBe(5);
    // 倒序：rows[0] 是最新
    for (const row of h.rows) {
      expect(row).toHaveProperty('at');
      expect(row).toHaveProperty('sealed');
      expect(row).toHaveProperty('reason');
      expect(row).toHaveProperty('pendingBefore');
      expect(row).toHaveProperty('segmentsBefore');
      expect(row).toHaveProperty('segmentsAfter');
      expect(row).toHaveProperty('intervalDue');
      expect(row).toHaveProperty('thresholdDue');
      expect(row).toHaveProperty('durationMs');
    }
    // at 倒序递增（最新在前 → 时间递减）
    for (let i = 1; i < h.rows.length; i++) {
      expect(h.rows[i - 1].at >= h.rows[i].at).toBe(true);
    }
  });

  test('不自激：tick 5 次后段数不变', () => {
    setAutoConfig({ enabled: false });
    const before = listSegments(100, 0).total;
    for (let i = 0; i < 5; i++) tick();
    const after = listSegments(100, 0).total;
    expect(after).toBe(before);
  });

  test('不自激：seal 1 次后立刻再 seal 第二次 → no-events', () => {
    seedN(3);
    const r1 = seal({});
    expect(r1.ok).toBe(true);
    const count1 = listSegments(100, 0).total;
    const r2 = seal({});
    expect(r2.ok).toBe(false);
    expect(r2.error).toBe('no-events');
    const count2 = listSegments(100, 0).total;
    expect(count2).toBe(count1);
  });

  test('search 返回 candidateSegments/decryptedSegments 字段', () => {
    seedN(3); seal({});
    const r = search({ limit: 50 });
    expect(typeof r.candidateSegments).toBe('number');
    expect(typeof r.decryptedSegments).toBe('number');
    expect(r.scannedSegments).toBeGreaterThanOrEqual(1);
  });

  test('offset 超出 total → rows=[] 且 total 正确', () => {
    seedN(3); seal({});
    const r = search({ limit: 50, offset: 99999 });
    expect(r.rows.length).toBe(0);
    expect(r.total).toBeGreaterThanOrEqual(3);
  });

  test('limit=abc 回退 50；offset=-5 回退 0', () => {
    seedN(3); seal({});
    // 路由层传 number，这里直接传 NaN 模拟
    const r1 = search({ limit: Number.NaN });
    expect(r1.rows.length).toBeGreaterThan(0);
    const r2 = search({ offset: -5 });
    expect(r2.rows.length).toBeGreaterThan(0);
  });
});
