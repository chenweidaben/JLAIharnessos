/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

/**
 * 日志器（Logger）
 *
 * 特性：
 * - 五级日志：DEBUG / INFO / WARN / ERROR / CRITICAL
 * - 结构化字段 + 业务上下文（requestId / sessionId / userId / patientId）
 * - 多传输（控制台 + 文件 + 远程），可在运行期增删
 * - 日志级别动态调整（不重启进程）
 * - 子 Logger 继承父上下文，便于模块隔离
 * - 性能耗时追踪（time / endTime）
 *
 * 零额外依赖，仅依赖 node:fs 与本目录格式化 / 传输模块。
 */

import { ConsoleTransport } from './LogTransport';
import type { LogContext, LogEntry, LogLevel, LogTransport } from './types';
import { LEVEL_PRIORITY } from './types';

export interface LoggerOptions {
  name?: string;
  level?: LogLevel;
  transports?: LogTransport[];
  context?: LogContext;
}

/** 全局默认级别 */
let globalLevel: LogLevel = 'INFO';

/** 全局传输（未注入 transports 时使用） */
const globalTransports: LogTransport[] = [new ConsoleTransport()];

export class Logger {
  private readonly name?: string;
  private level: LogLevel;
  private transports: LogTransport[];
  private readonly inheritedContext: LogContext;

  constructor(options: LoggerOptions = {}) {
    this.name = options.name;
    this.level = options.level ?? globalLevel;
    this.transports = options.transports ?? globalTransports;
    this.inheritedContext = options.context ?? {};
  }

  /** 设置全局默认级别（影响未显式指定 level 的 Logger） */
  public static setGlobalLevel(level: LogLevel): void {
    globalLevel = level;
  }

  /** 追加一个全局传输（启动装配时调用） */
  public static addGlobalTransport(t: LogTransport): void {
    globalTransports.push(t);
  }

  /** 动态调整本 Logger 的级别 */
  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  /** 创建携带额外上下文的子 Logger */
  public child(extraContext: LogContext, name?: string): Logger {
    return new Logger({
      name: name ?? this.name,
      level: this.level,
      transports: this.transports,
      context: { ...this.inheritedContext, ...extraContext },
    });
  }

  public debug(message: string, fields: Record<string, unknown> = {}): void {
    this.log('DEBUG', message, fields);
  }
  public info(message: string, fields: Record<string, unknown> = {}): void {
    this.log('INFO', message, fields);
  }
  public warn(message: string, fields: Record<string, unknown> = {}): void {
    this.log('WARN', message, fields);
  }
  public error(message: string, fields: Record<string, unknown> = {}): void {
    this.log('ERROR', message, fields);
  }
  public critical(message: string, fields: Record<string, unknown> = {}): void {
    this.log('CRITICAL', message, fields);
  }

  /** 统一写入入口 */
  private log(level: LogLevel, message: string, fields: Record<string, unknown>): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.level]) return;
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      logger: this.name,
      context: this.inheritedContext,
      fields,
    };
    for (const t of this.transports) {
      t.write(entry);
    }
  }

  /**
   * 性能计时：开始一个耗时追踪，返回结束函数
   *
   * @example
   * ```typescript
   * const end = logger.time('llm_call');
   * await llm.call();
   * end(); // 自动输出 info 日志，含 durationMs
   * ```
   */
  public time(label: string): () => void {
    const start = Date.now();
    return () => {
      const durationMs = Date.now() - start;
      this.info(`[perf] ${label}`, { label, durationMs });
    };
  }

  /** 关闭并 flush 所有传输 */
  public async close(): Promise<void> {
    await Promise.all(this.transports.map((t) => t.flush()));
  }
}

/** 默认导出一个根 Logger，便于业务直接 import */
export const rootLogger = new Logger({ name: 'jianlan' });
