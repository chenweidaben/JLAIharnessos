/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

/**
 * 日志系统共享类型
 */

/** 日志级别 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

/** 日志级别数值，用于比较 */
export const LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
  CRITICAL: 50,
};

/** 日志上下文：贯穿一次请求 / 会话的业务标识 */
export interface LogContext {
  requestId?: string;
  sessionId?: string;
  userId?: string;
  patientId?: string;
  traceId?: string;
  [key: string]: unknown;
}

/** 一条结构化日志 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  logger?: string;
  context: LogContext;
  fields: Record<string, unknown>;
}

/** 日志传输接口 */
export interface LogTransport {
  /** 写入一条日志（实现需自行处理异常，不能抛出） */
  write(entry: LogEntry): void;
  /** 刷新缓冲并关闭 */
  flush(): Promise<void>;
}
