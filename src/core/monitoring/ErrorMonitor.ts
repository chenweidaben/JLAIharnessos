/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

/**
 * 错误监控器（ErrorMonitor）
 *
 * 职责：
 * - 全局兜底：监听 uncaughtException / unhandledRejection
 * - 错误聚合：相同指纹的错误在时间窗口内去重，避免告警风暴
 * - 错误分级：info / warning / error / critical
 * - 上下文收集：堆栈、用户、患者、当前操作
 * - 上报接口：可注入 Sentry / 自建监控
 * - 告警规则：同一指纹 N 秒内出现 M 次即触发
 */

import { rootLogger } from '../logging/Logger';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ErrorContext {
  userId?: string;
  patientId?: string;
  operation?: string;
  route?: string;
  extra?: Record<string, unknown>;
}

export interface ErrorReport {
  fingerprint: string;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context: ErrorContext;
  occurredAt: number;
  count: number;
}

export interface ErrorReporter {
  report(report: ErrorReport): Promise<void> | void;
}

interface Aggregated {
  firstSeen: number;
  count: number;
  lastReportAt: number;
}

export interface ErrorMonitorOptions {
  /** 上报器（Sentry / 自建） */
  reporter?: ErrorReporter;
  /** 聚合窗口（毫秒），默认 60s */
  aggregateWindowMs?: number;
  /** 窗口内出现多少次才上报，默认 1 */
  threshold?: number;
  /** 是否自动挂载全局进程钩子 */
  attachGlobalHandlers?: boolean;
}

export class ErrorMonitor {
  private readonly reporter?: ErrorReporter;
  private readonly windowMs: number;
  private readonly threshold: number;
  private readonly aggregates = new Map<string, Aggregated>();
  private handlersAttached = false;

  constructor(options: ErrorMonitorOptions = {}) {
    this.reporter = options.reporter;
    this.windowMs = options.aggregateWindowMs ?? 60_000;
    this.threshold = options.threshold ?? 1;
    if (options.attachGlobalHandlers !== false) {
      this.attachGlobalHandlers();
    }
  }

  /** 挂载进程级兜底钩子 */
  public attachGlobalHandlers(): void {
    if (this.handlersAttached) return;
    this.handlersAttached = true;
    process.on('uncaughtException', (err) => {
      this.capture(err, { severity: 'critical', context: { operation: 'uncaughtException' } });
    });
    process.on('unhandledRejection', (reason) => {
      this.capture(reason, { severity: 'critical', context: { operation: 'unhandledRejection' } });
    });
  }

  /** 根据错误类型推断严重程度 */
  private inferSeverity(error: unknown): ErrorSeverity {
    if (error instanceof Error) {
      if (error.name === 'MedicalAgentError') return 'error';
      if (/timeout|ECONNRESET|ETIMEDOUT/i.test(error.message)) return 'warning';
    }
    return 'error';
  }

  /** 计算错误指纹（同名 + 首行堆栈） */
  private fingerprintOf(error: unknown): string {
    if (error instanceof Error) {
      const top = error.stack?.split('\n').slice(0, 3).join('|') ?? error.message;
      return `${error.name}::${top}`;
    }
    return `unknown::${String(error)}`;
  }

  /**
   * 捕获并上报一个错误
   */
  public capture(
    error: unknown,
    opts: { severity?: ErrorSeverity; context?: ErrorContext } = {},
  ): void {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    const fingerprint = this.fingerprintOf(error);
    const severity = opts.severity ?? this.inferSeverity(error);
    const now = Date.now();

    const agg = this.aggregates.get(fingerprint) ?? { firstSeen: now, count: 0, lastReportAt: 0 };
    agg.count += 1;
    if (now - agg.firstSeen > this.windowMs) {
      agg.firstSeen = now;
      agg.count = 1;
    }
    this.aggregates.set(fingerprint, agg);

    rootLogger.error(message, {
      fingerprint,
      severity,
      ...(opts.context?.extra ?? {}),
    });

    // 阈值未到，不重复上报
    if (agg.count < this.threshold || now - agg.lastReportAt < this.windowMs) {
      return;
    }
    agg.lastReportAt = now;

    const report: ErrorReport = {
      fingerprint,
      severity,
      message,
      stack,
      context: opts.context ?? {},
      occurredAt: now,
      count: agg.count,
    };
    void Promise.resolve(this.reporter?.report(report)).catch(() => {
      /* 上报失败不影响业务 */
    });
  }

  /** 当前聚合状态（供健康检查 / 看板使用） */
  public getSnapshot(): { fingerprint: string; count: number; firstSeen: number }[] {
    return [...this.aggregates.entries()].map(([fingerprint, a]) => ({
      fingerprint,
      count: a.count,
      firstSeen: a.firstSeen,
    }));
  }
}
