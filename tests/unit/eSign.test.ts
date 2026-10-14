/**
 * 健澜科技 jlmedaios - eSign 纯函数单测
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { describe, expect, it } from 'bun:test';
import { buildSignRecord, sha256Hex } from '../../src/bff/signing/eSign';

describe('eSign', () => {
  it('sha256Hex：同一内容结果确定', () => {
    expect(sha256Hex('病历正文-123')).toBe(sha256Hex('病历正文-123'));
  });

  it('sha256Hex：输出为 64 位小写 hex', () => {
    expect(sha256Hex('abc')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('sha256Hex：不同内容得到不同 hash', () => {
    expect(sha256Hex('内容A')).not.toBe(sha256Hex('内容B'));
  });

  it('buildSignRecord：记录结构完整且摘要等于内容 hash', () => {
    const now = new Date('2026-10-14T10:00:00.000Z');
    const rec = buildSignRecord(
      { bizType: 'note', bizId: '11111111-1111-1111-1111-111111111111', operatorId: '22222222-2222-2222-2222-222222222222', content: '病程记录正文' },
      now,
    );
    expect(rec.bizType).toBe('note');
    expect(rec.bizId).toBe('11111111-1111-1111-1111-111111111111');
    expect(rec.operatorId).toBe('22222222-2222-2222-2222-222222222222');
    expect(rec.contentHash).toBe(sha256Hex('病程记录正文'));
    expect(rec.signedAt).toBe('2026-10-14T10:00:00.000Z');
  });
});
