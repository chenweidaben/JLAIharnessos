/**
 * 健澜AI原生医院操作系统OS - P5-15 S3WormStore 与 CEF 契约测试
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, test } from 'bun:test';
import { MemoryWormStore } from '../../src/bff/aggregators/wormStore';
import { MockS3Client, S3WormStore } from '../../src/bff/aggregators/s3WormStore';
import { formatCEF, MockSyslogExporter } from '../../src/bff/aggregators/syslogCefExporter';

function makeSegment(seq: number, signerKeyId = 'k1'): any {
  return {
    segmentId: `WORM-0001-ab${seq}`,
    seq,
    fromSeq: seq,
    toSeq: seq,
    signerKeyId,
    segmentHash: `hash-${seq}`,
    prevSegmentHash: seq > 1 ? `hash-${seq - 1}` : '',
    events: [{ seq, at: '2026-01-01T00:00:00.000Z', patientId: 'P-1', type: 'lab', result: 'ok' }],
    sealedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('P5-15 S3WormStore 契约（与 MemoryWormStore 行为对齐）', () => {
  test('put → get 回读一致', async () => {
    const mem = new MemoryWormStore();
    const s3 = new MockS3Client();
    const s3Store = new S3WormStore(s3, 'test-bucket');
    const seg = makeSegment(1);
    mem.put(seg);
    await s3Store.put(seg);
    expect(mem.get(seg.segmentId)).toEqual(seg);
    expect(await s3Store.get(seg.segmentId)).toEqual(seg);
  });

  test('list 按 seq 排序一致', async () => {
    const mem = new MemoryWormStore();
    const s3 = new MockS3Client();
    const s3Store = new S3WormStore(s3, 'test-bucket');
    for (const s of [3, 1, 2]) {
      const seg = makeSegment(s);
      mem.put(seg);
      await s3Store.put(seg);
    }
    expect(mem.list().map((x) => x.seq)).toEqual([1, 2, 3]);
    expect((await s3Store.list()).map((x) => x.seq)).toEqual([1, 2, 3]);
  });

  test('countBySigner 累加一致', async () => {
    const mem = new MemoryWormStore();
    const s3 = new MockS3Client();
    const s3Store = new S3WormStore(s3, 'test-bucket');
    mem.put(makeSegment(1, 'k1')); mem.put(makeSegment(2, 'k1')); mem.put(makeSegment(3, 'k2'));
    await s3Store.put(makeSegment(1, 'k1')); await s3Store.put(makeSegment(2, 'k1')); await s3Store.put(makeSegment(3, 'k2'));
    expect(mem.countBySigner('k1')).toBe(2);
    expect(s3Store.countBySigner('k1')).toBe(2);
    expect(mem.countBySigner('k2')).toBe(1);
    expect(s3Store.countBySigner('k2')).toBe(1);
  });

  test('refresh 一致性：外部写入后重新拉列表', async () => {
    const s3 = new MockS3Client();
    const s3Store = new S3WormStore(s3, 'test-bucket');
    await s3Store.put(makeSegment(1, 'k1'));
    // 模拟另一进程直接写 S3
    await s3.putObject({ Bucket: 'test-bucket', Key: 'worm/segments/WORM-0001-ext9.json', Body: JSON.stringify(makeSegment(9, 'k2')) });
    expect(s3Store.count()).toBe(1); // 缓存还没看到
    await s3Store.refresh();
    expect(s3Store.count()).toBe(2);
    expect(s3Store.countBySigner('k2')).toBe(1);
  });

  test('重复 put 抛 duplicate-segment', async () => {
    const s3 = new MockS3Client();
    const s3Store = new S3WormStore(s3, 'test-bucket');
    const seg = makeSegment(1);
    await s3Store.put(seg);
    await expect(s3Store.put(seg)).rejects.toThrow('duplicate-segment');
  });
});

describe('P5-15 CEF 格式', () => {
  test('单事件 → 一行 CEF，字段顺序正确', () => {
    const { line } = formatCEF({
      at: '2026-01-01T00:00:00.000Z',
      ip: '10.0.0.1',
      actorId: 'admin-001',
      action: 'purge',
      result: 'ok',
      module: 'worm',
    });
    expect(line.startsWith('CEF:0|Jianlan|HospitalOS|1.0|WORM_PURGE|purge|5|')).toBe(true);
    expect(line).toContain('src=10.0.0.1');
    expect(line).toContain('suser=admin-001');
    expect(line).toContain('act=purge');
    expect(line).toContain('outcome=ok');
    expect(line).toContain('cs1Label=module');
    expect(line).toContain('cs1=worm');
    expect(line).toContain('rt=2026-01-01T00:00:00.000Z');
    // 一行（无换行）
    expect(line.includes('\n')).toBe(false);
  });

  test('字段含 | 或 \\ → 正确转义', () => {
    const { line } = formatCEF({ action: 'a|b\\c', result: 'ok', actorId: 'x' });
    expect(line).toContain('act=a\\|b\\\\c');
  });

  test('字段含换行 → 被清除为空格', () => {
    const { line } = formatCEF({ action: 'line1\nline2', result: 'ok', detail: 'a\r\nb' });
    expect(line.includes('\n')).toBe(false);
    expect(line.includes('\r')).toBe(false);
    expect(line).toContain('line1 line2');
  });

  test('批量 → 每事件一行', async () => {
    const exp = new MockSyslogExporter();
    const r = await exp.send([
      { action: 'retire', result: 'ok', actorId: 'u1' },
      { action: 'purge', result: 'fail', actorId: 'u2' },
    ]);
    expect(r.sent).toBe(2);
    expect(r.failed).toBe(0);
    expect(exp.messages.length).toBe(2);
    expect(exp.messages[0]).toContain('act=retire');
    expect(exp.messages[1]).toContain('act=purge');
    // 每条 severity 不同
    expect(exp.messages[0]).toMatch(/\|5\|/);
    expect(exp.messages[1]).toMatch(/\|3\|/);
  });

  test('失败计数：failNext 模拟发送失败', async () => {
    const exp = new MockSyslogExporter();
    exp.failNext = 1;
    const r = await exp.send([
      { action: 'retire', result: 'ok' },
      { action: 'purge', result: 'ok' },
    ]);
    expect(r.sent).toBe(1);
    expect(r.failed).toBe(1);
    expect(exp.messages.length).toBe(1);
  });
});
