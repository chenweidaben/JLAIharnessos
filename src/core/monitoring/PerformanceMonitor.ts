/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

/**
 * 性能监控器（PerformanceMonitor）
 *
 * 职责：
 * - API / 工具调用耗时埋点
 * - 滑动窗口统计 P50 / P95 / P99
 * - 内存 / CPU 采样
 * - 超时阈值告警
 */

import { rootLogger } from '../logging/Logger';

export interface MetricPoint {
  name: string;
  durationMs: number;
  at: number;
  tags?: Record<string, string>;
}

export interface PerformanceAlert {
  name: string;
  durationMs: number;
  thresholdMs: number;
  at: number;
}

type AlertListener = (alert: PerformanceAlert) => void;

const MAX_POINTS_PER_METRIC = 2000;

export class PerformanceMonitor {
  private readonly points = new Map<string, number[]>();
  private readonly alerts: PerformanceAlert[] = [];
  private listeners: AlertListener[] = [];
  private readonly defaultThresholdMs: number;

  constructor(defaultThresholdMs = 5000) {
    this.defaultThresholdMs = defaultThresholdMs;
  }

  /** 订阅超时告警 */
  public onAlert(listener: AlertListener): void {
    this.listeners.push(listener);
  }

  /**
   * 记录一次耗时
   */
  public record(point: MetricPoint, thresholdMs?: number): void {
    const arr = this.points.get(point.name) ?? [];
    arr.push(point.durationMs);
    if (arr.length > MAX_POINTS_PER_METRIC) arr.shift();
    this.points.set(point.name, arr);

    const threshold = thresholdMs ?? this.defaultThresholdMs;
    if (point.durationMs > threshold) {
      const alert: PerformanceAlert = {
        name: point.name,
        durationMs: point.durationMs,
        thresholdMs: threshold,
        at: point.at,
      };
      this.alerts.push(alert);
      rootLogger.warn(`[perf-alert] ${point.name} 超时`, { ...alert });
      for (const l of this.listeners) l(alert);
    }
  }

  /**
   * 包裹一段异步操作，自动计时
   */
  public async track<T>(name: string, fn: () => Promise<T>, thresholdMs?: number): Promise<T> {
    const start = Date.now();
    try {
      return await fn();
    } finally {
      this.record({ name, durationMs: Date.now() - start, at: Date.now() }, thresholdMs);
    }
  }

  /** 计算分位数 */
  public percentile(name: string, p: number): number {
    const arr = [...(this.points.get(name) ?? [])].sort((a, b) => a - b);
    if (arr.length === 0) return 0;
    const idx = Math.min(arr.length - 1, Math.floor((p / 100) * arr.length));
    return arr[idx];
  }

  /** 当前进程资源快照 */
  public memoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  /** 摘要：每个指标的 P50 / P95 / P99 / count */
  public summary(): Record<string, { p50: number; p95: number; p99: number; count: number }> {
    const out: Record<string, { p50: number; p95: number; p99: number; count: number }> = {};
    for (const name of this.points.keys()) {
      out[name] = {
        p50: this.percentile(name, 50),
        p95: this.percentile(name, 95),
        p99: this.percentile(name, 99),
        count: this.points.get(name)!.length,
      };
    }
    return out;
  }

  public recentAlerts(limit = 50): PerformanceAlert[] {
    return this.alerts.slice(-limit);
  }
}

/** 全局单例 */
export const performanceMonitor = new PerformanceMonitor();
