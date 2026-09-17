/**
 * 健澜科技数智医院智能体 - integration/monitoring/IntegrationMonitor.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 集成监控
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 负责集成适配器与接口的运行监控：
 * - 适配器健康状态监控
 * - 接口调用统计（成功率、响应时间、错误率）
 * - 告警规则（连续失败、响应超时、错误率超标）
 * - 监控指标导出（Prometheus 文本格式）
 *
 * @module integration/monitoring/IntegrationMonitor
 */

import type { AdapterStatus } from '../types';

/** 单次接口调用记录 */
export interface CallRecord {
  adapterId: string;
  method: string;
  success: boolean;
  durationMs: number;
  errorCode?: string;
  timestamp: number;
}

/** 适配器健康状态快照 */
export interface AdapterHealthSnapshot {
  adapterId: string;
  status: AdapterStatus;
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  successRate: number;
  avgResponseMs: number;
  p95ResponseMs: number;
  consecutiveFailures: number;
  lastError?: string;
  lastCalledAt?: number;
  alerted: boolean;
}

/** 告警级别 */
export type AlertLevel = 'warning' | 'critical';

/** 告警事件 */
export interface IntegrationAlert {
  alertId: string;
  adapterId: string;
  level: AlertLevel;
  rule: string;
  message: string;
  triggeredAt: number;
  context?: Record<string, unknown>;
}

/** 告警规则配置 */
export interface AlertRules {
  /** 连续失败次数阈值（达到后 critical） */
  consecutiveFailureThreshold: number;
  /** 响应时间阈值（毫秒，超过 warning） */
  slowResponseMs: number;
  /** 错误率阈值（0-1，超过 critical） */
  errorRateThreshold: number;
  /** 统计窗口（毫秒），用于错误率计算 */
  windowMs: number;
}

/** 监控订阅回调 */
export type AlertListener = (alert: IntegrationAlert) => void;

/**
 * 集成监控器
 *
 * 单例，供各适配器上报调用数据，统一聚合、告警与导出。
 */
export class IntegrationMonitor {
  private static instance: IntegrationMonitor | undefined;

  /** 适配器健康数据 */
  private healthMap = new Map<string, AdapterHealthSnapshot>();
  /** 调用记录环形缓冲（每个适配器保留最近 N 条用于 P95） */
  private callBuffer = new Map<string, number[]>();
  /** 调用总数（用于错误率窗口） */
  private recentCalls: { adapterId: string; success: boolean; at: number }[] = [];
  /** 告警监听器 */
  private alertListeners = new Set<AlertListener>();
  /** 告警规则 */
  private rules: AlertRules = {
    consecutiveFailureThreshold: 5,
    slowResponseMs: 3000,
    errorRateThreshold: 0.2,
    windowMs: 60_000,
  };
  /** 缓冲上限 */
  private readonly bufferLimit = 1000;
  private alertCounter = 0;

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- 私有构造函数用于阻止外部 new 实例化（单例模式）
  private constructor() {}

  /** 获取单例 */
  static getInstance(): IntegrationMonitor {
    IntegrationMonitor.instance ??= new IntegrationMonitor();
    return IntegrationMonitor.instance;
  }

  /** 重置（测试用） */
  static reset(): void {
    IntegrationMonitor.instance = undefined;
  }

  /** 更新告警规则 */
  setRules(rules: Partial<AlertRules>): void {
    this.rules = { ...this.rules, ...rules };
  }

  /** 订阅告警 */
  onAlert(listener: AlertListener): () => void {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }

  /**
   * 记录一次接口调用
   *
   * @param record - 调用记录
   */
  recordCall(record: CallRecord): void {
    const health = this.getOrCreateHealth(record.adapterId);
    health.totalCalls++;
    if (record.success) {
      health.successCalls++;
      health.consecutiveFailures = 0;
      health.alerted = false;
    } else {
      health.failedCalls++;
      health.consecutiveFailures++;
      health.lastError = record.errorCode ?? 'unknown';
    }
    health.lastCalledAt = record.timestamp;

    // 响应时间缓冲
    const times = this.callBuffer.get(record.adapterId) ?? [];
    times.push(record.durationMs);
    if (times.length > this.bufferLimit) times.shift();
    this.callBuffer.set(record.adapterId, times);

    // 窗口调用记录
    this.recentCalls.push({
      adapterId: record.adapterId,
      success: record.success,
      at: record.timestamp,
    });
    if (this.recentCalls.length > this.bufferLimit * 5) {
      this.recentCalls.shift();
    }

    // 重算派生指标
    this.recompute(health);

    // 触发告警评估
    this.evaluateAlerts(record.adapterId, health);
  }

  /**
   * 更新适配器状态（由适配器生命周期调用）
   */
  updateStatus(adapterId: string, status: AdapterStatus, error?: string): void {
    const health = this.getOrCreateHealth(adapterId);
    health.status = status;
    if (error) health.lastError = error;
  }

  /**
   * 获取适配器健康快照
   */
  getHealth(adapterId: string): AdapterHealthSnapshot | undefined {
    const h = this.healthMap.get(adapterId);
    return h ? { ...h } : undefined;
  }

  /**
   * 获取所有适配器健康快照
   */
  getAllHealth(): AdapterHealthSnapshot[] {
    return Array.from(this.healthMap.values()).map((h) => ({ ...h }));
  }

  /**
   * 导出为 Prometheus 文本格式
   */
  exportPrometheus(): string {
    const lines: string[] = [];
    lines.push('# HELP jianlan_integration_calls_total Total integration adapter calls');
    lines.push('# TYPE jianlan_integration_calls_total counter');
    lines.push('# HELP jianlan_integration_success_calls_total Successful calls');
    lines.push('# TYPE jianlan_integration_success_calls_total counter');
    lines.push('# HELP jianlan_integration_failed_calls_total Failed calls');
    lines.push('# TYPE jianlan_integration_failed_calls_total counter');
    lines.push('# HELP jianlan_integration_response_ms_avg Average response time ms');
    lines.push('# TYPE jianlan_integration_response_ms_avg gauge');
    lines.push('# HELP jianlan_integration_success_rate Current success rate 0-1');
    lines.push('# TYPE jianlan_integration_success_rate gauge');

    for (const h of this.healthMap.values()) {
      lines.push(`jianlan_integration_calls_total{adapter="${h.adapterId}"} ${h.totalCalls}`);
      lines.push(
        `jianlan_integration_success_calls_total{adapter="${h.adapterId}"} ${h.successCalls}`,
      );
      lines.push(
        `jianlan_integration_failed_calls_total{adapter="${h.adapterId}"} ${h.failedCalls}`,
      );
      lines.push(
        `jianlan_integration_response_ms_avg{adapter="${h.adapterId}"} ${h.avgResponseMs.toFixed(2)}`,
      );
      lines.push(
        `jianlan_integration_success_rate{adapter="${h.adapterId}"} ${h.successRate.toFixed(4)}`,
      );
    }
    return lines.join('\n');
  }

  // ============================================================
  // 内部
  // ============================================================

  private getOrCreateHealth(adapterId: string): AdapterHealthSnapshot {
    let h = this.healthMap.get(adapterId);
    if (!h) {
      h = {
        adapterId,
        status: 'uninitialized',
        totalCalls: 0,
        successCalls: 0,
        failedCalls: 0,
        successRate: 1,
        avgResponseMs: 0,
        p95ResponseMs: 0,
        consecutiveFailures: 0,
        alerted: false,
      };
      this.healthMap.set(adapterId, h);
    }
    return h;
  }

  private recompute(health: AdapterHealthSnapshot): void {
    health.successRate = health.totalCalls === 0 ? 1 : health.successCalls / health.totalCalls;
    const times = this.callBuffer.get(health.adapterId) ?? [];
    if (times.length > 0) {
      const sorted = [...times].sort((a, b) => a - b);
      health.avgResponseMs = times.reduce((a, b) => a + b, 0) / times.length;
      const p95Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
      health.p95ResponseMs = sorted[p95Idx];
    }
  }

  private evaluateAlerts(adapterId: string, health: AdapterHealthSnapshot): void {
    // 连续失败
    if (health.consecutiveFailures >= this.rules.consecutiveFailureThreshold) {
      this.fireAlert(
        adapterId,
        'critical',
        'consecutive_failures',
        `适配器 [${adapterId}] 连续失败 ${health.consecutiveFailures} 次`,
        { consecutiveFailures: health.consecutiveFailures },
      );
      health.alerted = true;
    }

    // 慢响应（基于最近一次已记录的 p95）
    if (health.p95ResponseMs > this.rules.slowResponseMs) {
      this.fireAlert(
        adapterId,
        'warning',
        'slow_response',
        `适配器 [${adapterId}] P95 响应 ${health.p95ResponseMs.toFixed(0)}ms 超过阈值 ${this.rules.slowResponseMs}ms`,
        { p95: health.p95ResponseMs, threshold: this.rules.slowResponseMs },
      );
    }

    // 窗口错误率
    const now = Date.now();
    const windowStart = now - this.rules.windowMs;
    const recent = this.recentCalls.filter((c) => c.adapterId === adapterId && c.at >= windowStart);
    if (recent.length > 0) {
      const failed = recent.filter((c) => !c.success).length;
      const rate = failed / recent.length;
      if (rate >= this.rules.errorRateThreshold) {
        this.fireAlert(
          adapterId,
          'critical',
          'high_error_rate',
          `适配器 [${adapterId}] 窗口错误率 ${(rate * 100).toFixed(1)}% 超过阈值 ${(this.rules.errorRateThreshold * 100).toFixed(0)}%`,
          { errorRate: rate, sampleSize: recent.length },
        );
      }
    }
  }

  private fireAlert(
    adapterId: string,
    level: AlertLevel,
    rule: string,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    this.alertCounter++;
    const alert: IntegrationAlert = {
      alertId: `ALM${String(this.alertCounter).padStart(6, '0')}`,
      adapterId,
      level,
      rule,
      message,
      triggeredAt: Date.now(),
      context,
    };
    this.alertListeners.forEach((cb) => {
      try {
        cb(alert);
      } catch {
        /* ignore */
      }
    });
  }
}
