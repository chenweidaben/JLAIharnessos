/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

/**
 * 日志传输层（LogTransport）
 *
 * 内置三种传输：
 * - ConsoleTransport：控制台彩色输出
 * - FileTransport：文件写入 + 按大小轮转 + 历史文件数量上限
 * - RemoteTransport：远程上报基类（缓冲 + 批量发送），对接 ELK / Loki / Sentry
 *
 * 文件传输采用同步追加写入，避免跨平台（Windows）下重命名仍被句柄占用导致轮转失败。
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { formatConsole, formatJson } from './LogFormatter';
import type { LogEntry, LogTransport } from './types';

/** 控制台传输：根据级别选择 stdout / stderr */
export class ConsoleTransport implements LogTransport {
  public write(entry: LogEntry): void {
    const line = formatConsole(entry);
    if (entry.level === 'ERROR' || entry.level === 'CRITICAL') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  }

  public async flush(): Promise<void> {
    /* 控制台无缓冲 */
  }
}

export interface FileTransportOptions {
  /** 日志目录 */
  dir: string;
  /** 当前活动文件名，默认 app.log */
  filename?: string;
  /** 单文件大小上限（字节），超过后轮转 */
  maxSizeBytes?: number;
  /** 保留的历史文件数量（不含当前文件） */
  maxFiles?: number;
}

/** 文件传输：大小轮转 + 历史文件淘汰（同步追加，跨平台安全） */
export class FileTransport implements LogTransport {
  private readonly dir: string;
  private readonly filename: string;
  private readonly maxSizeBytes: number;
  private readonly maxFiles: number;
  private currentSize = 0;

  constructor(options: FileTransportOptions) {
    this.dir = options.dir;
    this.filename = options.filename ?? 'app.log';
    this.maxSizeBytes = options.maxSizeBytes ?? 10 * 1024 * 1024;
    this.maxFiles = options.maxFiles ?? 14;
    fs.mkdirSync(this.dir, { recursive: true });
    try {
      this.currentSize = fs.statSync(this.filePath()).size;
    } catch {
      this.currentSize = 0;
    }
  }

  private filePath(): string {
    return path.join(this.dir, this.filename);
  }

  public write(entry: LogEntry): void {
    try {
      const line = formatJson(entry) + '\n';
      this.currentSize += Buffer.byteLength(line, 'utf8');
      fs.appendFileSync(this.filePath(), line, 'utf8');
      if (this.currentSize >= this.maxSizeBytes) {
        this.rotate();
      }
    } catch {
      /* 日志写入失败不能影响业务 */
    }
  }

  /** 执行轮转：app.log -> app.1.log -> app.2.log ... */
  private rotate(): void {
    try {
      const base = this.filePath();
      // 从旧到新移位
      for (let i = this.maxFiles; i >= 1; i--) {
        const from = `${base}.${i}`;
        const to = `${base}.${i + 1}`;
        if (fs.existsSync(from)) fs.renameSync(from, to);
      }
      if (fs.existsSync(base)) {
        fs.renameSync(base, `${base}.1`);
      }
      // 淘汰超出 maxFiles 的文件
      const expired = `${base}.${this.maxFiles + 1}`;
      if (fs.existsSync(expired)) fs.rmSync(expired, { force: true });

      this.currentSize = 0;
    } catch {
      /* 轮转失败忽略，继续写当前文件 */
    }
  }

  public async flush(): Promise<void> {
    /* 同步写入无需 flush */
  }
}

export interface RemoteTransportOptions {
  /** 批量发送的条数阈值 */
  batchSize?: number;
  /** 最大缓冲条数，超出则丢弃最旧日志 */
  maxBuffer?: number;
  /** 批量发送回调（由子类 / 装配层实现，对接 ELK/Loki） */
  sender: (batch: LogEntry[]) => Promise<void>;
}

/** 远程传输基类：缓冲 + 批量发送 */
export class RemoteTransport implements LogTransport {
  private readonly batchSize: number;
  private readonly maxBuffer: number;
  private readonly sender: (batch: LogEntry[]) => Promise<void>;
  private buffer: LogEntry[] = [];

  constructor(options: RemoteTransportOptions) {
    this.batchSize = options.batchSize ?? 50;
    this.maxBuffer = options.maxBuffer ?? 1000;
    this.sender = options.sender;
  }

  public write(entry: LogEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length > this.maxBuffer) {
      this.buffer.shift();
    }
    if (this.buffer.length >= this.batchSize) {
      void this.flush();
    }
  }

  public async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.buffer.length);
    try {
      await this.sender(batch);
    } catch {
      /* 远程上报失败不阻塞业务，由监控兜底 */
    }
  }
}
