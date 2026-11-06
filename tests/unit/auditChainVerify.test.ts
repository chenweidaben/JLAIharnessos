/**
 * P5-22: verifyChainSync 断链检测单元测试
 *
 * 证明 sourceChainValid 真的会变：
 * - 健康链 → true
 * - 第一条 prevHash ≠ GENESIS → false, brokenAt=1
 * - 中段断链 → false, brokenAt=N
 * - 空数组 → true（无链可断）
 *
 * 如果将来有人把 verifyChainSync 改成永远返回 true，这些用例必须红。
 */
import { describe, it, expect, beforeEach } from 'bun:test';
import {
  verifyChainSync,
  __resetStore,
  __injectPending,
  GENESIS,
  computeHash,
  canonical,
} from '../../src/bff/aggregators/auditEventAggregator.ts';
import type { AuditEvent } from '../../src/bff/aggregators/auditEventAggregator.ts';

function makeEvent(seq: number, prevHash: string, eventId = `evt-${seq}`): AuditEvent {
  const base = {
    eventId, seq, occurredAt: new Date().toISOString(),
    actorId: 'test', actorRole: 'admin' as const, action: 'login' as const,
    module: 'test', resourceType: 'unit', resourceId: `r-${seq}`,
    patientId: null, result: 'success' as const, errorCode: null,
    ip: '127.0.0.1', userAgent: 'test', prevHash,
  };
  return { ...base, hash: computeHash(prevHash, canonical(base)) };
}

describe('verifyChainSync 断链检测', () => {
  beforeEach(() => __resetStore());

  it('健康链（GENESIS 起、逐条 computeHash）→ valid:true', () => {
    let prev = GENESIS;
    for (let i = 1; i <= 3; i++) {
      const evt = makeEvent(i, prev);
      __injectPending(evt);
      prev = evt.hash;
    }
    const r = verifyChainSync();
    expect(r.valid).toBe(true);
    expect(r.totalEvents).toBe(3);
  });

  it('第一条 prevHash ≠ GENESIS → valid:false, brokenAt=1', () => {
    __injectPending(makeEvent(1, 'fake-prev'));
    const r = verifyChainSync();
    expect(r.valid).toBe(false);
    expect(r.brokenAt).toBe(1);
  });

  it('中段断链（第 2 条 prevHash 不匹配）→ valid:false, brokenAt=2', () => {
    const evt1 = makeEvent(1, GENESIS);
    __injectPending(evt1);
    // 第 2 条 prevHash 故意写错（不是 evt1.hash）
    __injectPending(makeEvent(2, 'wrong-prev'));
    const r = verifyChainSync();
    expect(r.valid).toBe(false);
    expect(r.brokenAt).toBe(2);
  });

  it('哈希被篡改（prevHash 对但 hash 不对）→ valid:false, brokenAt=2', () => {
    const evt1 = makeEvent(1, GENESIS);
    __injectPending(evt1);
    const evt2 = makeEvent(2, evt1.hash);
    // 篡改 hash
    __injectPending({ ...evt2, hash: 'tampered-hash' });
    const r = verifyChainSync();
    expect(r.valid).toBe(false);
    expect(r.brokenAt).toBe(2);
  });

  it('空数组 → valid:true（无链可断）', () => {
    const r = verifyChainSync();
    expect(r.valid).toBe(true);
    expect(r.totalEvents).toBe(0);
  });
});
