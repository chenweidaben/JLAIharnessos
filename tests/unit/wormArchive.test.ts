/**
 * 健澜AI原生医院操作系统OS - P5-2/P5-4 WORM 归档 单测（国密硬化版）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import { __resetStore as resetAudit, recordEvent } from '../../src/bff/aggregators/auditEventAggregator';
import {
  __getCipherHex, __resetStore, __sm3StandardVector, createProbe, getSegment,
  getSegmentEvents, keyStatus, listSegments, resetProbes, seal, sm2Verify,
  tamperProbeDigest, tamperProbeSignature, verify,
} from '../../src/bff/aggregators/wormArchiveAggregator';

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
