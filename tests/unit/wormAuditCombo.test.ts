/**
 * 健澜AI原生医院操作系统OS - P5-13 不安全组合自检单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, test } from 'bun:test';
import { assertWormAuditCombo } from '../../src/bff/aggregators/wormStore';

describe('P5-13 assertWormAuditCombo', () => {
  test('audit=pg + worm=fs → ok（生产安全组合）', () => {
    const r = assertWormAuditCombo('pg', 'fs', 'production');
    expect(r.ok).toBe(true);
  });

  test('audit=memory + worm=memory → ok（E2E/单测默认）', () => {
    const r = assertWormAuditCombo('memory', 'memory', 'development');
    expect(r.ok).toBe(true);
  });

  test('audit=memory + worm=fs → ok', () => {
    const r = assertWormAuditCombo('memory', 'fs', 'production');
    expect(r.ok).toBe(true);
  });

  test('audit=pg + worm=memory + production → ok=false（抛错）', () => {
    const r = assertWormAuditCombo('pg', 'memory', 'production');
    expect(r.ok).toBe(false);
    expect(r.message).toContain('unsafe combo');
  });

  test('audit=pg + worm=memory + development → ok=true（只 console.error 不阻断）', () => {
    const r = assertWormAuditCombo('pg', 'memory', 'development');
    expect(r.ok).toBe(true);
    expect(r.message).toContain('WORM_BACKEND=fs');
  });
});
