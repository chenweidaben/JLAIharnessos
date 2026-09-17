/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

/**
 * 监控告警模块统一出口
 */

export type {
  ErrorContext,
  ErrorMonitorOptions,
  ErrorReport,
  ErrorReporter,
  ErrorSeverity,
} from './ErrorMonitor';
export { ErrorMonitor } from './ErrorMonitor';
export type {
  HealthCheckerOptions,
  HealthCheckItem,
  HealthReport,
  HealthStatus,
  Probe,
} from './HealthChecker';
export { HealthChecker } from './HealthChecker';
export type { MetricPoint, PerformanceAlert } from './PerformanceMonitor';
export { PerformanceMonitor, performanceMonitor } from './PerformanceMonitor';
