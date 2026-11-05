/**
 * 健澜AI原生医院操作系统OS - P5-14 keyOpsStore 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let testDir = '';
let origDir = '';

beforeAll(() => {
  origDir = process.env.WORM_STORE_DIR ?? '';
  testDir = mkdtempSync(join(tmpdir(), 'keyops-'));
  process.env.WORM_STORE_DIR = testDir;
});

afterAll(() => {
  if (origDir) process.env.WORM_STORE_DIR = origDir;
  else delete process.env.WORM_STORE_DIR;
  try { rmSync(testDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

// 每次用例前清空目录内容（但保留目录本身）
import { readdirSync } from 'node:fs';
function resetDir(): void {
  for (const f of readdirSync(testDir)) {
    try { rmSync(join(testDir, f), { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

describe('P5-14 keyOpsStore', () => {
  test('单实例追加 200 条 → 读回 200', async () => {
    resetDir();
    const mod = await import('../../src/bff/aggregators/keyOpsStore');
    for (let i = 0; i < 200; i++) {
      mod.appendKeyOp({ actorId: `u${i}`, action: 'retire', keyId: `k${i}`, result: 'ok', refs: null });
    }
    const r = mod.readKeyOps(0);
    expect(r.ops.length).toBe(200);
    expect(r.malformed).toBe(0);
  });

  test('两实例各写 100 条（不同 instanceId）→ 合并读回 200', async () => {
    resetDir();
    const mod = await import('../../src/bff/aggregators/keyOpsStore');
    // 第一实例写 100 条
    for (let i = 0; i < 100; i++) {
      mod.appendKeyOp({ actorId: `a${i}`, action: 'purge', keyId: `ka${i}`, result: 'ok', refs: 1 });
    }
    // 模拟第二实例：直接往目录里写另一个 instanceId 的 jsonl
    const otherFile = join(testDir, `_key-ops-otherhost-9999-abc123-${new Date().toISOString().slice(0,10).replace(/-/g,'')}.jsonl`);
    const lines: string[] = [];
    for (let i = 0; i < 100; i++) {
      lines.push(JSON.stringify({ at: new Date().toISOString(), actorId: `b${i}`, action: 'purge', keyId: `kb${i}`, result: 'ok', refs: 1 }));
    }
    writeFileSync(otherFile, lines.join('\n') + '\n', 'utf8');
    const r = mod.readKeyOps(0);
    expect(r.ops.length).toBe(200);
    expect(r.files).toBe(2);
    expect(r.malformed).toBe(0);
  });

  test('坏行跳过：往 jsonl 里插一行 {invalid → malformed=1', async () => {
    resetDir();
    const mod = await import('../../src/bff/aggregators/keyOpsStore');
    mod.appendKeyOp({ actorId: 'u1', action: 'retire', keyId: 'k1', result: 'ok', refs: null });
    // 找到当前实例文件，追加一行坏数据
    const files = readdirSync(testDir).filter((f) => f.endsWith('.jsonl'));
    expect(files.length).toBe(1);
    const p = join(testDir, files[0]);
    writeFileSync(p, readFileSync(p, 'utf8') + '{invalid\n', 'utf8');
    const r = mod.readKeyOps(0);
    expect(r.ops.length).toBe(1);
    expect(r.malformed).toBe(1);
  });

  test('旧格式迁移幂等：迁移两次条数不翻倍', async () => {
    resetDir();
    const legacy = join(testDir, '_key-ops.json');
    const arr = [
      { at: '2026-01-01T00:00:00.000Z', actorId: 'u1', action: 'retire', keyId: 'k1', result: 'ok', refs: null },
      { at: '2026-01-01T00:01:00.000Z', actorId: 'u2', action: 'purge', keyId: 'k2', result: 'ok', refs: 1 },
    ];
    writeFileSync(legacy, JSON.stringify(arr, null, 2), 'utf8');
    const mod = await import('../../src/bff/aggregators/keyOpsStore');
    const r1 = mod.readKeyOps(0);
    expect(r1.ops.length).toBe(2);
    // 旧文件应被 rename
    expect(existsSync(legacy)).toBe(false);
    expect(existsSync(legacy + '.migrated')).toBe(true);
    // 第二次读：没有旧文件了，条数不翻倍
    const r2 = mod.readKeyOps(0);
    expect(r2.ops.length).toBe(2);
  });

  test('跨实例清理：他实例的旧文件同样被清理，新文件保留', async () => {
    resetDir();
    const mod = await import('../../src/bff/aggregators/keyOpsStore');
    // 造 3 个实例的文件，每个实例一个"300 天前"旧文件 + 一个"今天"新文件
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const oldDate = '20200101'; // 远早于 180 天
    const oldFiles: string[] = [];
    const newFiles: string[] = [];
    for (const inst of ['hostA-111-aaa111', 'hostB-222-bbb222', 'hostC-333-ccc333']) {
      const oldF = join(testDir, `_key-ops-${inst}-${oldDate}.jsonl`);
      const newF = join(testDir, `_key-ops-${inst}-${today}.jsonl`);
      writeFileSync(oldF, JSON.stringify({ at: '2020-01-01T00:00:00.000Z', actorId: 'x', action: 'retire', keyId: 'kx', result: 'ok', refs: null }) + '\n', 'utf8');
      writeFileSync(newF, JSON.stringify({ at: new Date().toISOString(), actorId: 'y', action: 'purge', keyId: 'ky', result: 'ok', refs: 1 }) + '\n', 'utf8');
      oldFiles.push(oldF);
      newFiles.push(newF);
    }
    const r = mod.cleanupOldKeyOps({ dryRun: false, retentionDays: 180 });
    expect(r.removed).toBe(3);
    for (const f of oldFiles) expect(existsSync(f)).toBe(false);
    for (const f of newFiles) expect(existsSync(f)).toBe(true);
  });

  test('180 天边界：181 天前删、179 天前留', async () => {
    resetDir();
    const mod = await import('../../src/bff/aggregators/keyOpsStore');
    const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
    const d181 = fmt(new Date(Date.now() - 181 * 86400_000));
    const d179 = fmt(new Date(Date.now() - 179 * 86400_000));
    const oldF = join(testDir, `_key-ops-host-111-aaa111-${d181}.jsonl`);
    const newF = join(testDir, `_key-ops-host-222-bbb222-${d179}.jsonl`);
    writeFileSync(oldF, 'x\n', 'utf8');
    writeFileSync(newF, 'x\n', 'utf8');
    const r = mod.cleanupOldKeyOps({ dryRun: false, retentionDays: 180 });
    expect(r.removed).toBe(1);
    expect(existsSync(oldF)).toBe(false);
    expect(existsSync(newF)).toBe(true);
  });

  test('env 覆盖：KEY_OPS_RETENTION_DAYS=200 生效；非法值抛错', async () => {
    const mod = await import('../../src/bff/aggregators/keyOpsStore');
    // 合法覆盖
    expect(mod.resolveRetentionDays('200')).toBe(200);
    // 非法值
    expect(() => mod.resolveRetentionDays('abc')).toThrow(/正整数/);
    expect(() => mod.resolveRetentionDays('0')).toThrow(/正整数/);
    expect(() => mod.resolveRetentionDays('30')).toThrow(/180/);
    // 空字符串/undefined → 默认 180
    expect(mod.resolveRetentionDays('')).toBe(180);
    expect(mod.resolveRetentionDays(undefined)).toBe(180);
  });

  test('dry-run 不删文件、apply 才删', async () => {
    resetDir();
    const mod = await import('../../src/bff/aggregators/keyOpsStore');
    const oldDate = '20200101';
    const oldF = join(testDir, `_key-ops-host-111-aaa111-${oldDate}.jsonl`);
    writeFileSync(oldF, 'x\n', 'utf8');
    // 默认 dry-run=true
    const r1 = mod.cleanupOldKeyOps({ retentionDays: 180 });
    expect(r1.removed).toBe(0);
    expect(r1.files.length).toBe(1);
    expect(existsSync(oldF)).toBe(true);
    // 显式 apply
    const r2 = mod.cleanupOldKeyOps({ dryRun: false, retentionDays: 180 });
    expect(r2.removed).toBe(1);
    expect(existsSync(oldF)).toBe(false);
  });

  test('INSTANCE_ID 非空、无连续 --、文件名能被清理正则匹配', async () => {
    const mod = await import('../../src/bff/aggregators/keyOpsStore');
    const id = mod.__instanceId();
    expect(id.length).toBeGreaterThan(0);
    expect(id).not.toMatch(/--/);
    // 模拟清理正则能识别 _key-ops-<id>-<YYYYMMDD>.jsonl
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fname = `_key-ops-${id}-${today}.jsonl`;
    expect(fname).toMatch(/^_key-ops-[^-]+-\d+-[a-z0-9]+-(\d{8})\.jsonl$/);
  });

  test('回归 P5-11b：WORM_STORE_DIR 指向不存在的嵌套路径 → 写一条 → 目录自动创建、读回 1 条', async () => {
    const nested = join(testDir, 'a', 'b', 'c', 'keyops');
    expect(existsSync(nested)).toBe(false);
    const prev = process.env.WORM_STORE_DIR;
    process.env.WORM_STORE_DIR = nested;
    try {
      const mod = await import('../../src/bff/aggregators/keyOpsStore');
      mod.appendKeyOp({ actorId: 'u-nested', action: 'retire', keyId: 'k-nested', result: 'ok', refs: null });
      expect(existsSync(nested)).toBe(true);
      const r = mod.readKeyOps(0);
      expect(r.ops.length).toBe(1);
      expect(r.ops[0].actorId).toBe('u-nested');
      expect(r.malformed).toBe(0);
    } finally {
      process.env.WORM_STORE_DIR = prev ?? '';
    }
  });
});
