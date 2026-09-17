/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 日志系统单元测试
 */

import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { Logger } from '../../../src/core/logging/Logger';
import { FileTransport } from '../../../src/core/logging/LogTransport';
import { desensitize } from '../../../src/core/logging/LogFormatter';
import type { LogEntry, LogLevel, LogTransport } from '../../../src/core/logging/types';

/** 收集式内存 Transport，便于断言 */
class InMemoryTransport implements LogTransport {
  public entries: LogEntry[] = [];
  write(entry: LogEntry): void {
    this.entries.push(entry);
  }
  async flush(): Promise<void> {}
}

describe('Logger', () => {
  let sink: InMemoryTransport;
  let logger: Logger;

  beforeEach(() => {
    sink = new InMemoryTransport();
    logger = new Logger({ name: 'test', level: 'DEBUG', transports: [sink] });
  });

  it('应按级别过滤日志', () => {
    const quiet = new Logger({ level: 'ERROR', transports: [sink] });
    quiet.info('被过滤');
    quiet.error('被记录');
    expect(sink.entries).toHaveLength(1);
    expect(sink.entries[0]!.message).toBe('被记录');
  });

  it('应记录结构化字段与上下文', () => {
    const child = logger.child({ requestId: 'req-1', userId: 'u-1' });
    child.info('查询患者', { patientId: 'P001' });
    expect(sink.entries).toHaveLength(1);
    const e = sink.entries[0]!;
    expect(e.context.requestId).toBe('req-1');
    expect(e.fields.patientId).toBe('P001');
  });

  it('time() 应输出耗时', () => {
    const end = logger.time('op');
    end();
    expect(sink.entries).toHaveLength(1);
    expect(sink.entries[0]!.fields).toHaveProperty('durationMs');
  });

  it('动态调整级别后生效', () => {
    logger.setLevel('WARN');
    logger.info('no');
    logger.warn('yes');
    expect(sink.entries.map((e) => e.message)).toEqual(['yes']);
  });

  it('所有级别方法均可调用', () => {
    (['debug', 'info', 'warn', 'error', 'critical'] as const).forEach((m) =>
      logger[m](m),
    );
    expect(sink.entries).toHaveLength(5);
  });
});

describe('desensitize', () => {
  it('应掩码手机号与身份证号', () => {
    const out = desensitize({
      phone: '13812345678',
      idCard: '11010119900307777X',
      note: '联系 13999998888',
    });
    expect(out.phone).toContain('****');
    expect(out.idCard).toContain('****');
    expect(out.note as string).toContain('****');
  });

  it('应脱敏敏感字段名', () => {
    const out = desensitize({ name: '张三', address: '杭州市余杭区某某路' });
    expect(out.name).not.toBe('张三');
    expect(out.address as string).toContain('*');
  });
});

describe('FileTransport 轮转', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jl-log-'));
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('应按大小轮转并保留历史文件', async () => {
    const t = new FileTransport({ dir: tmpDir, maxSizeBytes: 256, maxFiles: 2 });
    for (let i = 0; i < 20; i++) {
      t.write({
        timestamp: Date.now(),
        level: 'INFO' as LogLevel,
        message: 'x'.repeat(80) + i,
        context: {},
        fields: {},
      });
    }
    await t.flush();
    const files = fs.readdirSync(tmpDir);
    expect(files.length).toBeGreaterThan(1);
  });
});
