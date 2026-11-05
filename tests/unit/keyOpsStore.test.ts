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

  test('cleanupOldKeyOps 只删本实例旧文件', async () => {
    resetDir();
    const mod = await import('../../src/bff/aggregators/keyOpsStore');
    // 写一条当前实例的
    mod.appendKeyOp({ actorId: 'u1', action: 'retire', keyId: 'k1', result: 'ok', refs: null });
    // 写一个"其他实例"的旧文件（31 天前 mtime 由 cleanup 自己判断）
    const otherFile = join(testDir, '_key-ops-otherhost-1111-xyz000-20200101.jsonl');
    writeFileSync(otherFile, JSON.stringify({ at: '2020-01-01T00:00:00.000Z', actorId: 'x', action: 'retire', keyId: 'kx', result: 'ok', refs: null }) + '\n', 'utf8');
    const removed = mod.cleanupOldKeyOps(30);
    // 其他实例的旧文件不删（只删本 instanceId 前缀的）
    expect(removed).toBe(0);
    expect(existsSync(otherFile)).toBe(true);
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
