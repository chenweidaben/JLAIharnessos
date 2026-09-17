/**
 * 健澜科技数智医院智能体 - integration/monitoring/IntegrationLogger.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 集成日志
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 统一记录集成过程中的请求/响应、错误与性能日志，
 * 支持内存环形缓冲与按大小/条数轮转。
 *
 * @module integration/monitoring/IntegrationLogger
 */

/** 日志级别 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** 日志条目 */
export interface LogEntry {
  /** 时间戳（ISO） */
  timestamp: string;
  /** 日志级别 */
  level: LogLevel;
  /** 适配器ID */
  adapterId: string;
  /** 日志类别 */
  category: 'request' | 'response' | 'error' | 'performance' | 'system';
  /** 日志消息 */
  message: string;
  /** 附加数据 */
  data?: Record<string, unknown>;
}

/** 日志器配置 */
export interface IntegrationLoggerConfig {
  /** 缓冲条数上限（超过后轮转，丢弃最旧） */
  maxEntries?: number;
  /** 最低输出级别 */
  minLevel?: LogLevel;
}

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * 集成日志器
 *
 * 单例，内存环形缓冲，支持按类别检索与轮转。
 */
export class IntegrationLogger {
  private static instance: IntegrationLogger | undefined;

  private entries: LogEntry[] = [];
  private maxEntries: number;
  private minLevel: LogLevel;

  private constructor(config: IntegrationLoggerConfig = {}) {
    this.maxEntries = config.maxEntries ?? 10000;
    this.minLevel = config.minLevel ?? 'debug';
  }

  /** 获取单例 */
  static getInstance(config?: IntegrationLoggerConfig): IntegrationLogger {
    IntegrationLogger.instance ??= new IntegrationLogger(config);
    return IntegrationLogger.instance;
  }

  /** 重置（测试用） */
  static reset(): void {
    IntegrationLogger.instance = undefined;
  }

  /**
   * 记录请求
   */
  logRequest(adapterId: string, message: string, data?: Record<string, unknown>): void {
    this.append({ level: 'info', adapterId, category: 'request', message, data });
  }

  /**
   * 记录响应
   */
  logResponse(adapterId: string, message: string, data?: Record<string, unknown>): void {
    this.append({ level: 'info', adapterId, category: 'response', message, data });
  }

  /**
   * 记录错误
   */
  logError(adapterId: string, message: string, data?: Record<string, unknown>): void {
    this.append({ level: 'error', adapterId, category: 'error', message, data });
  }

  /**
   * 记录性能
   */
  logPerformance(adapterId: string, message: string, data?: Record<string, unknown>): void {
    this.append({ level: 'info', adapterId, category: 'performance', message, data });
  }

  /**
   * 记录系统日志
   */
  logSystem(
    level: LogLevel,
    adapterId: string,
    message: string,
    data?: Record<string, unknown>,
  ): void {
    this.append({ level, adapterId, category: 'system', message, data });
  }

  /**
   * 追加日志（含级别过滤与轮转）
   */
  private append(entry: Omit<LogEntry, 'timestamp'>): void {
    if (LEVEL_WEIGHT[entry.level] < LEVEL_WEIGHT[this.minLevel]) {
      return;
    }
    const full: LogEntry = { timestamp: new Date().toISOString(), ...entry };
    this.entries.push(full);
    // 轮转：超过上限丢弃最旧
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  /**
   * 查询日志
   *
   * @param filter - 过滤条件
   * @param limit - 返回条数
   */
  query(
    filter: {
      adapterId?: string;
      category?: LogEntry['category'];
      level?: LogLevel;
      since?: string;
    },
    limit = 100,
  ): LogEntry[] {
    let result = this.entries;
    if (filter.adapterId) result = result.filter((e) => e.adapterId === filter.adapterId);
    if (filter.category) result = result.filter((e) => e.category === filter.category);
    if (filter.level) result = result.filter((e) => e.level === filter.level);
    if (filter.since) result = result.filter((e) => e.timestamp >= filter.since!);
    return result.slice(-limit);
  }

  /**
   * 错误日志数量
   */
  errorCount(): number {
    return this.entries.filter((e) => e.level === 'error').length;
  }

  /**
   * 清空日志
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * 当前缓冲条数
   */
  size(): number {
    return this.entries.length;
  }
}
