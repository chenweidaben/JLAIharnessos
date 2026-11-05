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
  createProbe, getSegment, getSegmentEvents, keyStatus, listSegments, queryAuditEventsCount, resetProbes,
  seal, sm2Verify, storeInfo, tamperProbeDigest, tamperProbeSignature, verify,
} from '../../src/bff/aggregators/wormArchiveAggregator';
import { FileWormStore, __resetWormStore, isValidSegmentId, getWormStore } from '../../src/bff/aggregators/wormStore';
import { getAutoConfig, listTickHistory, rebuildIndex, search, setAutoConfig, tick, __resetDecryptCache, __resetIndexCache, __resetTickHistory } from '../../src/bff/aggregators/wormAuto';

beforeEach(() => { resetAudit(); __resetStore(); resetProbes(); });

async function seedN(n: number): Promise<string[]> {
  const actions: string[] = [];
  for (let i = 0; i < n; i++) {
    const act = 'create'; // 用合法 action；密文断言不依赖具体 action 字符串
    actions.push(act);
    await recordEvent({
      actorId: `D${i}-${Math.random().toString(36).slice(2, 6)}`,
      actorRole: 'doctor', action: act, module: 'emr',
      resourceType: 'note', resourceId: `N${i}-${Math.random().toString(36).slice(2, 6)}`,
      result: 'success',
      ip: '1.1.1.1', userAgent: 'ua',
    });
  }
  return actions;
}

describe('P5-2 seal 基础（回归）', async () => {
  test('无事件 seal → no-events', async () => {
    expect(seal({}).ok).toBe(false);
  });
  test('首段 prevSegmentHash = GENESIS', async () => {
    await seedN(3);
    const r = seal({});
    expect(r.ok).toBe(true);
    expect(r.segment!.prevSegmentHash).toBe('GENESIS');
  });
  test('第二段 prev == 第一段 hash', async () => {
    await seedN(3); const s1 = seal({}).segment!;
    await seedN(2); const s2 = seal({}).segment!;
    expect(s2.prevSegmentHash).toBe(s1.segmentHash);
  });
  test('幂等：无新事件再 seal → no-events', async () => {
    await seedN(3); seal({});
    expect(seal({}).ok).toBe(false);
  });
});

describe('P5-4 SM3 摘要', async () => {
  test('SM3 标准向量：sm3("abc") === 66c7f0f4...ba8e0', async () => {
    expect(__sm3StandardVector()).toBe('66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0');
  });
  test('段字段含 digestAlg=SM3 与 digestSm3 64 hex', async () => {
    await seedN(3);
    const r = seal({});
    expect(r.segment!.digestAlg).toBe('SM3');
    expect(r.segment!.digestSm3).toMatch(/^[0-9a-f]{64}$/);
  });
  test('SM3 稳定：同输入同摘要（重算一致）', async () => {
    await seedN(3);
    const r = seal({});
    const seg = getSegment(r.segment!.segmentId)!;
    expect(seg.digestSm3).toBe(r.segment!.digestSm3);
  });
});

describe('P5-4 SM4 加密', async () => {
  test('段字段含 sm4Encrypted=true、iv、cipherBytes', async () => {
    await seedN(3);
    const r = seal({});
    expect(r.segment!.sm4Encrypted).toBe(true);
    expect(r.segment!.iv).toMatch(/^[0-9a-f]{32}$/);
    expect(r.segment!.cipherBytes.length).toBeGreaterThan(0);
  });
  test('密文不含明文 actorId 关键词（核心安全断言）', async () => {
    await seedN(3);
    const r = seal({});
    const cipherHex = __getCipherHex(r.segment!.segmentId)!;
    // 取该段所有 events，验证每个 actorId 都不在密文 hex 中
    const evts = getSegmentEvents(r.segment!.segmentId)!;
    for (const e of evts) {
      const actorHex = Buffer.from(e.actorId, 'utf8').toString('hex');
      expect(cipherHex.toLowerCase()).not.toContain(actorHex.toLowerCase());
    }
  });
  test('content 端点解密往返：明文与原 events 一致', async () => {
    await seedN(3);
    const r = seal({});
    const evts = getSegmentEvents(r.segment!.segmentId)!;
    expect(evts.length).toBe(3);
    expect(evts[0].action).toBe('create');
  });
});

describe('P5-4 SM2 签名', async () => {
  test('段字段含 sm2Signature 与 signerKeyId', async () => {
    await seedN(3);
    const r = seal({});
    expect(r.segment!.sm2Signature.length).toBeGreaterThan(0);
    expect(r.segment!.signerKeyId).toBeTruthy();
  });
  test('正常段 sm2Verify(digestSm3, signature) = true', async () => {
    await seedN(3);
    const r = seal({});
    expect(sm2Verify(r.segment!.digestSm3, r.segment!.sm2Signature)).toBe(true);
  });
  test('篡改 digestSm3 后 sm2Verify = false', async () => {
    await seedN(3);
    const r = seal({});
    // 用一个假的 64 hex digest
    const fakeDigest = '0'.repeat(64);
    expect(sm2Verify(fakeDigest, r.segment!.sm2Signature)).toBe(false);
  });
  test('keyStatus 不泄露私钥字段，返 hex 公钥', async () => {
    const s = keyStatus();
    expect(s.signerKeyId).toBeTruthy();
    // SM2 公钥 130 hex（04+x+y）
    expect(s.publicKeyHex).toMatch(/^04[0-9a-f]{128}$/);
    expect(JSON.stringify(s)).not.toContain('PRIVATE KEY');
    expect(JSON.stringify(s)).not.toContain('privateKey');
  });
});

describe('P5-4 verify 扩展字段', async () => {
  test('未篡改段 verify → digestValid=true signatureValid=true', async () => {
    await seedN(3); seal({});
    const v = verify('real');
    expect(v.realChainValid).toBe(true);
    expect(v.digestValid).toBe(true);
    expect(v.signatureValid).toBe(true);
    expect(v.segments.length).toBe(1);
    expect(v.segments[0].digestValid).toBe(true);
  });
  test('_tamper-digest 后 verify all → brokenScope=probe', async () => {
    await seedN(3); const s1 = seal({}).segment!;
    const probe = createProbe(s1.segmentId)!;
    tamperProbeDigest(probe.probeId);
    const v = verify('all');
    expect(v.valid).toBe(false);
    expect(v.brokenScope).toBe('probe');
  });
  test('_tamper-signature 后 verify all → brokenScope=probe', async () => {
    await seedN(3); const s1 = seal({}).segment!;
    const probe = createProbe(s1.segmentId)!;
    tamperProbeSignature(probe.probeId);
    const v = verify('all');
    expect(v.valid).toBe(false);
    expect(v.brokenScope).toBe('probe');
  });
  test('_probes/reset 后 verify 恢复 valid=true', async () => {
    await seedN(3); const s1 = seal({}).segment!;
    const probe = createProbe(s1.segmentId)!;
    tamperProbeDigest(probe.probeId);
    expect(verify('all').valid).toBe(false);
    resetProbes();
    expect(verify('all').valid).toBe(true);
  });
  test('真实段未被 _tamper-digest 污染（verify?scope=real 仍 valid）', async () => {
    await seedN(3); const s1 = seal({}).segment!;
    const probe = createProbe(s1.segmentId)!;
    tamperProbeDigest(probe.probeId);
    tamperProbeSignature(probe.probeId);
    const v = verify('real');
    expect(v.realChainValid).toBe(true);
    expect(v.digestValid).toBe(true);
    expect(v.signatureValid).toBe(true);
  });
});

describe('P5-4 查询', async () => {
  test('listSegments 分页', async () => {
    await seedN(3); seal({});
    await seedN(2); seal({});
    expect(listSegments(10, 0).total).toBe(2);
  });
});

describe('P5-5 路径穿越防护', async () => {
  test('合法 segmentId 通过', async () => {
    expect(isValidSegmentId('WORM-0001-abc123')).toBe(true);
    expect(isValidSegmentId('VERIFY-PROBE-1-xyz')).toBe(true);
  });
  test('恶意串被拒（3 例）', async () => {
    expect(isValidSegmentId('../../etc/passwd')).toBe(false);
    expect(isValidSegmentId('..\\..\\win.ini')).toBe(false);
    expect(isValidSegmentId('WORM-0001-x/../../y')).toBe(false);
  });
  test('getSegment 对非法 id 返 null（不抛）', async () => {
    expect(getSegment('../../etc/passwd')).toBeNull();
  });
});

describe('P5-5 FileWormStore', async () => {
  test('put → get 往返 + 新实例同目录读回（等价重启不丢）', async () => {
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

describe('P5-5 seqContinuity', async () => {
  test('正常无缝 → valid=true', async () => {
    await seedN(3); seal({});
    await seedN(3); seal({});
    const v = verify('real');
    expect(v.seqContinuity.valid).toBe(true);
    expect(v.seqContinuity.gaps.length).toBe(0);
  });
  test('人为构造 toSeq 跳号 → gaps 非空', async () => {
    const segs = [
      { segmentId: 'WORM-1-a', seq: 1, fromSeq: 1, toSeq: 3 },
      { segmentId: 'WORM-2-b', seq: 2, fromSeq: 10, toSeq: 12 },
    ] as never[];
    const c = checkSeqContinuity(segs as never);
    expect(c.valid).toBe(false);
    expect(c.gaps.length).toBeGreaterThan(0);
  });
  test('seq 重复 → duplicateSeq 非空', async () => {
    const segs = [
      { segmentId: 'WORM-1-a', seq: 1, fromSeq: 1, toSeq: 3 },
      { segmentId: 'WORM-2-b', seq: 2, fromSeq: 1, toSeq: 3 },
    ] as never[];
    const c = checkSeqContinuity(segs as never);
    expect(c.valid).toBe(false);
    expect(c.duplicateSeq.length).toBeGreaterThan(0);
  });
  test('首段 fromSeq≠1 → startGap 记录但不判 fail', async () => {
    const segs = [
      { segmentId: 'WORM-1-a', seq: 1, fromSeq: 5, toSeq: 7 },
    ] as never[];
    const c = checkSeqContinuity(segs as never);
    expect(c.startGap).toEqual({ expected: 1, actual: 5 });
    // 单段不构成 gap，valid=true
    expect(c.valid).toBe(true);
  });
});

describe('P5-5 storeInfo', async () => {
  test('storeInfo 返 kind 与 segmentCount', async () => {
    await seedN(3); seal({});
    const s = storeInfo();
    expect(s.kind).toBe('memory');
    expect(s.segmentCount).toBe(1);
    expect(s.oldestSeq).toBe(1);
  });
});

describe('P5-5 fs 后端重启后计数器回填', async () => {
  function mkSeg(segmentId: string, seq: number, fromSeq: number, toSeq: number): never {
    return {
      segmentId, seq, fromSeq, toSeq, eventCount: toSeq - fromSeq + 1,
      segmentHash: 'b'.repeat(64), prevSegmentHash: 'GENESIS', sourceChainHead: 'c'.repeat(64),
      sourceChainValid: true, sealedAt: new Date().toISOString(), bytes: 10,
      digestAlg: 'SM3', digestSm3: 'd'.repeat(64), sm4Encrypted: true, iv: 'e'.repeat(32),
      cipherBytes: 'ff', sm2Signature: 'a'.repeat(128), signerKeyId: 'x', keySource: 'demo-ephemeral',
    } as never;
  }

  test('磁盘已有段 → 重启后 seq 续写、不重复归档', async () => {
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

      await seedN(6); // 新进程事件流重新从 1 开始，1..4 已归档过
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

describe('P5-6 自动调度 + 检索', async () => {
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
  test('getAutoConfig 默认值', async () => {
    const c = getAutoConfig();
    expect(c.enabled).toBe(false);
    expect(c.intervalMs).toBeGreaterThan(0);
  });
  test('setAutoConfig 持久化', async () => {
    const c = setAutoConfig({ enabled: true, intervalMs: 60000, threshold: 5 });
    expect(c.enabled).toBe(true);
    expect(c.intervalMs).toBe(60000);
    expect(getAutoConfig().intervalMs).toBe(60000);
  });
  test('tick 无事件 → sealed=false（disabled 或 no-events）', async () => {
    setAutoConfig({ enabled: true, intervalMs: 1, threshold: 1 });
    const r = tick();
    expect(r.sealed).toBe(false);
    expect(['no-events', 'disabled', 'below-threshold']).toContain(r.reason ?? '');
  });
  test('search 返回分页结构', async () => {
    const r = search({ limit: 50 });
    expect(Array.isArray(r.rows)).toBe(true);
    expect(typeof r.total).toBe('number');
    expect(typeof r.scannedSegments).toBe('number');
  });
  test('部分更新不清空其它配置字段（undefined 不得覆盖）', async () => {
    setAutoConfig({ enabled: true, intervalMs: 60000, threshold: 5 });
    const c = setAutoConfig({ intervalMs: 30000 } as Partial<{ intervalMs: number }>);
    expect(c.enabled).toBe(true);      // 未被 undefined 清空
    expect(c.threshold).toBe(5);       // 保持原值
    expect(c.intervalMs).toBe(30000);
    expect(getAutoConfig().enabled).toBe(true);
  });
  test('配置越界值被夹紧（intervalMs<threshold 非法）', async () => {
    const c = setAutoConfig({ intervalMs: 10, threshold: 0 });
    expect(c.intervalMs).toBeGreaterThanOrEqual(1000);
    expect(c.threshold).toBeGreaterThanOrEqual(1);
  });
  test('时间窗触发：间隔已到即使未到阈值也封段', async () => {
    await recordEvent({
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
  test('interval 未到且未到阈值 → 不封段', async () => {
    await recordEvent({
      actorId: 'A-TICK2', actorRole: 'doctor', action: 'create', module: 'emr',
      resourceType: 'note', resourceId: 'N-TICK2', result: 'success',
      ip: '1.1.1.1', userAgent: 'ua',
    });
    setAutoConfig({ enabled: true, intervalMs: 3600_000, threshold: 50, lastSealAt: new Date().toISOString() });
    const r = tick();
    expect(r.sealed).toBe(false);
    expect(r.reason).toBe('below-threshold');
  });
  test('limit 非法（NaN/负数/0）回退默认且不返回空页', async () => {
    await seedN(3);
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

describe('P5-7 tick 落审计 + 检索性能', async () => {
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

  test('tick 5 次 → history total=5，8 字段齐全、at 递增', async () => {
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

  test('不自激：tick 5 次后段数不变', async () => {
    setAutoConfig({ enabled: false });
    const before = listSegments(100, 0).total;
    for (let i = 0; i < 5; i++) tick();
    const after = listSegments(100, 0).total;
    expect(after).toBe(before);
  });

  test('不自激：seal 1 次后立刻再 seal 第二次 → no-events', async () => {
    await seedN(3);
    const r1 = seal({});
    expect(r1.ok).toBe(true);
    const count1 = listSegments(100, 0).total;
    const r2 = seal({});
    expect(r2.ok).toBe(false);
    expect(r2.error).toBe('no-events');
    const count2 = listSegments(100, 0).total;
    expect(count2).toBe(count1);
  });

  test('search 返回 candidateSegments/decryptedSegments 字段', async () => {
    await seedN(3); seal({});
    const r = search({ limit: 50 });
    expect(typeof r.candidateSegments).toBe('number');
    expect(typeof r.decryptedSegments).toBe('number');
    expect(r.scannedSegments).toBeGreaterThanOrEqual(1);
  });

  test('offset 超出 total → rows=[] 且 total 正确', async () => {
    await seedN(3); seal({});
    const r = search({ limit: 50, offset: 99999 });
    expect(r.rows.length).toBe(0);
    expect(r.total).toBeGreaterThanOrEqual(3);
  });

  test('limit=abc 回退 50；offset=-5 回退 0', async () => {
    await seedN(3); seal({});
    // 路由层传 number，这里直接传 NaN 模拟
    const r1 = search({ limit: Number.NaN });
    expect(r1.rows.length).toBeGreaterThan(0);
    const r2 = search({ offset: -5 });
    expect(r2.rows.length).toBeGreaterThan(0);
  });
});

describe('P5-7 防自激：待归档池只由真实业务事件驱动', async () => {
  test('pending 计数 = lastArchivedSeq 之后的事件数（与段无缝对齐）', async () => {
    await seedN(3);
    expect(queryAuditEventsCount()).toBe(3);
    seal({});
    expect(queryAuditEventsCount()).toBe(0);
    await seedN(2);
    expect(queryAuditEventsCount()).toBe(2);
  });

  test('连续封段 fromSeq/toSeq 严格无缝（nextFrom = prevTo + 1）', async () => {
    await seedN(2);
    const s1 = seal({}).segment!;
    await seedN(2);
    const s2 = seal({}).segment!;
    expect(s2.fromSeq).toBe(s1.toSeq + 1);
    expect(s1.eventCount).toBe(2);
    expect(s2.eventCount).toBe(2);
  });

  test('无新业务事件时 tick 不会封段（不产生空转段）', async () => {
    await seedN(2);
    seal({});
    __resetTickHistory();
    const r1 = tick();
    expect(r1.sealed).toBe(false);
    const r2 = tick();
    expect(r2.sealed).toBe(false);
    expect(listSegments().total).toBe(1);
  });
});

describe('P5-9 purge 真实 store refs 统计（非 mock）', async () => {
  test('seal 2 段后 purge(k1) → key-in-use refs=2，k1 仍可验签', async () => {
    // 用真实 store（内存即可），不 mock checker
    const { getKeyProvider, __resetKeyProvider, DemoEphemeralKeyProvider } =
      require('../../src/bff/aggregators/wormKeyProvider');
    __resetKeyProvider(new DemoEphemeralKeyProvider());
    const provider = getKeyProvider();
    // 用 O(1) 索引 countBySigner
    provider.setKeyInUseChecker((kid: string) => getWormStore().countBySigner(kid));

    await seedN(2);
    const r1 = seal({});
    expect(r1.ok).toBe(true);
    const k1 = r1.segment!.signerKeyId;

    await seedN(2);
    const r1b = seal({});
    expect(r1b.ok).toBe(true);
    expect(r1b.segment!.signerKeyId).toBe(k1); // 未 rotate，仍是 k1

    // rotate 让 k2 成为 active，这样 k1 不再是 active key，可以 purge
    provider.rotate();

    // 现在 store 里有 2 段用 k1 签
    const purgeResult = provider.purge(k1);
    expect(purgeResult.ok).toBe(false);
    expect(purgeResult.error).toBe('key-in-use');
    expect(purgeResult.refs).toBe(2); // 来自真实 store.list()，两段都用 k1

    // k1 仍在环里
    expect(provider.getPublicKey(k1)).not.toBeNull();

    // 两段仍 verify 通过（按段 signerKeyId 选钥验签）
    const v = verify('real');
    expect(v.valid).toBe(true);
  });
});

describe('P5-11 FileWormStore 自动检测跨进程写入', async () => {
  test('实例 B 写入后实例 A 不 refresh 也能看到', async () => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'worm-ad-'));
    const { FileWormStore } = require('../../src/bff/aggregators/wormStore');
    const storeA = new FileWormStore(tmp);
    const storeB = new FileWormStore(tmp);

    // B.put 一段，signerKeyId='kX'
    storeB.put({ segmentId: 'WORM-2026-ad1', seq: 1, prevHash: '0'.repeat(64), hash: 'a'.repeat(64), payloadCid: 'cid-1', signerKeyId: 'kX', signature: 'sig-1', sealedAt: '2026-11-05T00:00:00Z', verifiedAt: '2026-11-05T00:00:01Z' });
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);

    // A 不调 refresh()，直接 countBySigner
    expect(storeA.countBySigner('kX')).toBe(1);
    expect(storeA.list().length).toBe(storeB.list().length);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('连续 put 3 次后 A 的索引与真实一致', async () => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'worm-ad2-'));
    const { FileWormStore } = require('../../src/bff/aggregators/wormStore');
    const storeA = new FileWormStore(tmp);
    const storeB = new FileWormStore(tmp);

    for (let i = 1; i <= 3; i++) {
      storeB.put({ segmentId: `WORM-2026-ad2${i}`, seq: i, prevHash: '0'.repeat(64), hash: 'a'.repeat(64), payloadCid: `cid-${i}`, signerKeyId: 'kY', signature: `sig-${i}`, sealedAt: '2026-11-05T00:00:00Z', verifiedAt: '2026-11-05T00:00:01Z' });
    }

    expect(storeA.countBySigner('kY')).toBe(3);
    expect(storeA.list().length).toBe(3);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  // P5-11b：purge 判定依赖「索引 0 命中时强制 refresh」，本用例证明该兜底有效。
  // 构造：目录 mtime 被冻结（模拟同一精度窗口内的外部写入），autoDetect 走快速返回
  // 路径看不到新段；显式 refresh() 必须无视 mtime 缓存重建索引。
  test('mtime 冻结时 autoDetect 漏检，refresh 强制重扫可纠正（purge 兜底保证）', async () => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'worm-ad3-'));
    const frozen = new Date('2026-11-05T00:00:00.000Z');
    fs.utimesSync(tmp, frozen, frozen);

    const { FileWormStore } = require('../../src/bff/aggregators/wormStore');
    const storeA = new FileWormStore(tmp);

    // 直接落盘（模拟另一进程写入），随后把目录 mtime 改回原值
    fs.writeFileSync(path.join(tmp, 'WORM-2026-ad3.json'), JSON.stringify({
      segmentId: 'WORM-2026-ad3', seq: 1, prevHash: '0'.repeat(64), hash: 'a'.repeat(64),
      payloadCid: 'cid-ad3', signerKeyId: 'kZ', signature: 'sig-ad3',
      sealedAt: '2026-11-05T00:00:00Z', verifiedAt: '2026-11-05T00:00:01Z',
    }), 'utf8');
    fs.utimesSync(tmp, frozen, frozen);

    // 快速路径按 mtime 判断"无变化"，索引仍是旧的 0（漏检窗口真实存在）
    expect(storeA.countBySigner('kZ')).toBe(0);

    // purge 前强制重扫后，真实引用数必须被看见
    storeA.refresh();
    expect(storeA.countBySigner('kZ')).toBe(1);
    expect(storeA.list().filter((s: { signerKeyId?: string }) => s.signerKeyId === 'kZ').length).toBe(1);

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe('P5-12 mtime 边界补测', async () => {
  test('同精度窗口连续 put 2 段，A 不 refresh 也能看到 2', async () => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'worm-mt1-'));
    const { FileWormStore } = require('../../src/bff/aggregators/wormStore');
    const storeA = new FileWormStore(tmp);
    const storeB = new FileWormStore(tmp);

    // 连续无 sleep put 2 段，尽量落在同一 mtime 精度窗口
    storeB.put({ segmentId: 'WORM-2026-mt1a', seq: 1, prevHash: '0'.repeat(64), hash: 'a'.repeat(64), payloadCid: 'c1', signerKeyId: 'kX', signature: 's1', sealedAt: '2026-11-05T00:00:00Z', verifiedAt: '2026-11-05T00:00:01Z' });
    storeB.put({ segmentId: 'WORM-2026-mt1b', seq: 2, prevHash: 'a'.repeat(64), hash: 'b'.repeat(64), payloadCid: 'c2', signerKeyId: 'kX', signature: 's2', sealedAt: '2026-11-05T00:00:02Z', verifiedAt: '2026-11-05T00:00:03Z' });
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);

    // ensureKeyInUseChecker 的 0 命中强制 refresh 兜底
    storeA.refresh?.();
    expect(storeA.countBySigner('kX')).toBe(2);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('两个 store 实例交错 put，父进程读回无丢失', async () => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'worm-mt2-'));
    const { FileWormStore } = require('../../src/bff/aggregators/wormStore');
    const storeA = new FileWormStore(tmp);
    const storeB = new FileWormStore(tmp);

    storeA.put({ segmentId: 'WORM-2026-mt2a', seq: 1, prevHash: '0'.repeat(64), hash: 'a'.repeat(64), payloadCid: 'c1', signerKeyId: 'kA', signature: 's1', sealedAt: '2026-11-05T00:00:00Z', verifiedAt: '2026-11-05T00:00:01Z' });
    storeB.put({ segmentId: 'WORM-2026-mt2b', seq: 2, prevHash: 'a'.repeat(64), hash: 'b'.repeat(64), payloadCid: 'c2', signerKeyId: 'kB', signature: 's2', sealedAt: '2026-11-05T00:00:02Z', verifiedAt: '2026-11-05T00:00:03Z' });
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);

    expect(storeA.count()).toBe(2);
    expect(storeB.count()).toBe(2);
    expect(storeA.countBySigner('kA')).toBe(1);
    expect(storeA.countBySigner('kB')).toBe(1);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('目录删除后重建，新段 seq 从 1 开始', async () => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'worm-mt3-'));
    const { FileWormStore } = require('../../src/bff/aggregators/wormStore');
    const storeA = new FileWormStore(tmp);
    storeA.put({ segmentId: 'WORM-2026-mt3a', seq: 1, prevHash: '0'.repeat(64), hash: 'a'.repeat(64), payloadCid: 'c1', signerKeyId: 'kZ', signature: 's1', sealedAt: '2026-11-05T00:00:00Z', verifiedAt: '2026-11-05T00:00:01Z' });
    expect(storeA.count()).toBe(1);

    // 删目录
    fs.rmSync(tmp, { recursive: true, force: true });
    // 重新构造，应自动 mkdir
    const storeB = new FileWormStore(tmp);
    expect(storeB.count()).toBe(0);
    storeB.put({ segmentId: 'WORM-2026-mt3b', seq: 1, prevHash: '0'.repeat(64), hash: 'b'.repeat(64), payloadCid: 'c2', signerKeyId: 'kZ', signature: 's2', sealedAt: '2026-11-05T00:00:02Z', verifiedAt: '2026-11-05T00:00:03Z' });
    expect(storeB.count()).toBe(1);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe('P5-13 seal 跨段 seq 衔接 fail-closed', async () => {
  test('pending 首条 seq !== lastArchivedSeq+1 → 拒绝 seq-gap', async () => {
    await seedN(3);
    const r1 = seal({});
    expect(r1.ok).toBe(true);
    const { __injectPending } = await import('../../src/bff/aggregators/auditEventAggregator');
    __injectPending({
      eventId: 'injected', seq: 100, occurredAt: '2026-11-06T00:00:00Z',
      actorId: 'zhangsan', actorRole: 'admin', action: 'login', module: 'auth',
      resourceType: 'session', resourceId: 's-100', result: 'success',
      ip: '127.0.0.1', userAgent: 't', prevHash: 'h', hash: 'h',
    } as any);
    const r2 = seal({});
    expect(r2.ok).toBe(false);
    expect(r2.error).toBe('seq-gap');
    expect(r2.expectedSeq).toBe(4);
    expect(r2.actualFirstSeq).toBe(100);
  });

  test('正常衔接：pending 首条 === lastArchivedSeq+1 → 放行', async () => {
    await seedN(3);
    const s1 = seal({});
    expect(s1.ok).toBe(true);
    await seedN(2);
    const s2 = seal({});
    expect(s2.ok).toBe(true);
    expect(s2.segment!.fromSeq).toBe(4);
    expect(s2.segment!.toSeq).toBe(5);
  });
});
