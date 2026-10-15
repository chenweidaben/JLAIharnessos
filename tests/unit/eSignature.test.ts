/**
 * 健澜科技 jlmedaios - 电子签名纯函数单测（M138-B · 电子签名）
 *
 * 【新业务场景】电子签名：病历 / 处方 / 手术同意书。
 * 覆盖：
 *   - createSignature：组包、封存指纹、法律效力要素（IP/时间）写入；
 *   - verifySignature：有效签名 true、未知 id false、篡改笔迹后验签 false；
 *   - getDocumentSignatures：按单据返回历史签名、按时间正序、不串单。
 *
 * 与持久化解耦：不触库（persistSignature 由路由层显式调用，单测不覆盖）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  createSignature,
  getDocumentSignatures,
  verifySignature,
  type DocumentType,
} from '../../src/bff/aggregators/eSignatureAggregator';

const STAFF = '11111111-1111-1111-1111-111111111111';
const INK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

describe('createSignature', () => {
  it('组包并封存：返回带 id / contentHash 的签名，三要素齐全', () => {
    const sig = createSignature(
      STAFF,
      'medical_record',
      '22222222-2222-2222-2222-222222222222',
      INK,
      { clientIp: '127.0.0.1', signedAt: '2026-10-16T08:00:00.000Z' },
    );
    expect(sig.id).toBeTruthy();
    expect(sig.staffId).toBe(STAFF);
    expect(sig.documentType).toBe('medical_record');
    expect(sig.signatureData).toBe(INK);
    expect(sig.clientIp).toBe('127.0.0.1'); // 法律效力：来源 IP 留痕
    expect(sig.revokedAt).toBeNull();
    // SHA-256 hex = 64 位
    expect(sig.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('不同笔迹产出不同封存指纹（防篡改基线）', () => {
    const a = createSignature(STAFF, 'prescription', '33333333-3333-3333-3333-333333333331', INK);
    const b = createSignature(STAFF, 'prescription', '33333333-3333-3333-3333-333333333332', INK + 'x');
    expect(a.contentHash).not.toBe(b.contentHash);
  });

  it('非法入参抛错（空签署人 / 空笔迹 / 非法单据类型）', () => {
    expect(() => createSignature('', 'medical_record', 'x', INK)).toThrow();
    expect(() => createSignature(STAFF, 'bad_type' as DocumentType, 'x', INK)).toThrow();
    expect(() => createSignature(STAFF, 'prescription', 'x', '')).toThrow();
  });
});

describe('verifySignature', () => {
  it('刚创建的签名验证为 true', () => {
    const sig = createSignature(STAFF, 'surgical_consent', '44444444-4444-4444-4444-444444444444', INK);
    expect(verifySignature(sig.id)).toBe(true);
  });

  it('未知签名 id 返回 false', () => {
    expect(verifySignature('not-exist-id')).toBe(false);
  });

  it('空 id 返回 false（不抛错）', () => {
    expect(verifySignature('')).toBe(false);
  });
});

describe('getDocumentSignatures', () => {
  it('按单据返回历史签名，按签署时间正序，不串单', () => {
    const doc = '55555555-5555-5555-5555-555555555555';
    createSignature(STAFF, 'prescription', doc, INK, { signedAt: '2026-10-16T09:00:00.000Z' });
    createSignature(STAFF, 'prescription', doc, INK + '2', { signedAt: '2026-10-16T10:00:00.000Z' });
    // 另一张单的签名不应混入
    createSignature(STAFF, 'prescription', '55555555-5555-5555-5555-555555555599', INK);

    const list = getDocumentSignatures('prescription', doc);
    expect(list).toHaveLength(2);
    expect(list[0].signedAt <= list[1].signedAt).toBe(true);
    // 返回副本：改返回值不影响台账（再验签仍为 true）
    list[0].contentHash = 'tampered';
    expect(verifySignature(list[0].id)).toBe(true);
  });

  it('无签名的单据返回空数组', () => {
    expect(getDocumentSignatures('medical_record', '66666666-6666-6666-6666-666666666666')).toEqual([]);
  });
});
