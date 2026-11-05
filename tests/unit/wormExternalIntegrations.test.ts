/**
 * 健澜AI原生医院操作系统OS - P5-15 S3WormStore 与 CEF 契约测试
 *
 * S3 契约用例同时跑在 AsyncWormStore(S3WormStore+MockS3) 与 toAsyncStore(MemoryWormStore) 上，
 * 断言两边行为一致。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, test } from 'bun:test';
import { MemoryWormStore, toAsyncStore, type AsyncWormStore } from '../../src/bff/aggregators/wormStore';
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

async function runAsyncContract(makeStore: () => AsyncWormStore) {
  const mem = new MemoryWormStore();
  const ref = toAsyncStore(mem);
  const sut = makeStore();

  // put → get 回读
  const seg1 = makeSegment(1, 'k1');
  await ref.put(seg1);
  await sut.put(seg1);
  expect(await sut.get(seg1.segmentId)).toEqual(seg1);

  // list 按 seq 排序
  for (const s of [3, 2]) {
    const seg = makeSegment(s, s === 2 ? 'k1' : 'k2');
    mem.put(seg);
    await sut.put(seg);
  }
  const sutList = await sut.list();
  expect(sutList.map((x) => x.seq)).toEqual([1, 2, 3]);

  // countBySigner 累加
  expect(await sut.countBySigner('k1')).toBe(2);
  expect(await sut.countBySigner('k2')).toBe(1);

  // newestSeq
  expect(await sut.newestSeq()).toBe(3);

  // refresh：外部写入后重新拉
  // 仅对 S3 路径做（MemoryWormStore 没有"外部写入"概念）
  if (sut instanceof S3WormStore) {
    const extra = makeSegment(9, 'k3');
    await (sut as any).s3.putObject({
      Bucket: 'test-bucket',
      Key: 'worm/segments/' + extra.segmentId + '.json',
      Body: JSON.stringify(extra),
    });
    // refresh 后能看到外部写入
    await sut.refresh();
    expect(await sut.get(extra.segmentId)).not.toBeNull();
    expect(await sut.countBySigner('k3')).toBe(1);
  }

  // duplicate-segment
  await expect(sut.put(seg1)).rejects.toThrow('duplicate-segment');
}

describe('P5-15 AsyncWormStore 契约（S3 与 Memory 参照行为一致）', () => {
  test('MemoryWormStore via toAsyncStore 满足契约', async () => {
    await runAsyncContract(() => toAsyncStore(new MemoryWormStore()));
  });

  test('S3WormStore(MockS3) 满足同一套契约', async () => {
    await runAsyncContract(() => new S3WormStore(new MockS3Client(), 'test-bucket'));
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
