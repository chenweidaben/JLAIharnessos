/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 前端监控 SDK：错误捕获 / 性能采集 / 用户行为埋点
 * - init：初始化
 * - captureException：捕获异常
 * - track：埋点事件
 * - setUser：设置用户信息
 * - performance：Web Vitals 采集
 */

interface MonitoringConfig {
  appId: string;
  userId?: string;
  sampleRate?: number; // 0-1，默认 1.0
  endpoint?: string;
  enableConsole?: boolean;
}

interface ErrorInfo {
  message: string;
  stack?: string;
  type: string;
  url: string;
  userAgent: string;
  timestamp: number;
  userId?: string;
  breadcrumbs: string[];
}

interface TrackEvent {
  event: string;
  properties?: Record<string, unknown>;
  timestamp: number;
  userId?: string;
}

class MonitoringSDK {
  private config: Required<Pick<MonitoringConfig, 'appId' | 'sampleRate'>> & {
    endpoint?: string;
    userId?: string;
  } = { appId: '', sampleRate: 1 };
  private breadcrumbs: string[] = [];
  private initialized = false;
  private tags: Record<string, string> = {};

  /** 初始化监控 */
  init(config: MonitoringConfig): void {
    if (this.initialized) return;
    this.config = {
      appId: config.appId,
      sampleRate: config.sampleRate ?? 1,
      endpoint: config.endpoint,
      userId: config.userId,
    };
    this.initialized = true;

    this.bindGlobalError();
    this.bindUnhandledRejection();
    this.collectWebVitals();
  }

  /** 全局错误捕获 */
  private bindGlobalError(): void {
    window.onerror = (message, source, _lineno, _colno, error) => {
      this.captureException({
        message: String(message),
        stack: error?.stack,
        type: 'onerror',
        url: source ?? '',
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        userId: this.config.userId,
        breadcrumbs: this.breadcrumbs.slice(-20),
      });
    };
  }

  private bindUnhandledRejection(): void {
    window.addEventListener('unhandledrejection', (event) => {
      this.captureException({
        message: String(event.reason?.message ?? event.reason),
        stack: event.reason?.stack,
        type: 'unhandledrejection',
        url: location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        userId: this.config.userId,
        breadcrumbs: this.breadcrumbs.slice(-20),
      });
    });
  }

  /** 捕获异常 */
  captureException(info: ErrorInfo): void {
    if (Math.random() > this.config.sampleRate) return;
    this.pushBreadcrumb(`error:${info.message}`);
    // 生产环境上报到 endpoint；开发环境仅 console
    if (this.config.endpoint) {
      navigator.sendBeacon?.(
        this.config.endpoint,
        JSON.stringify({ ...info, appId: this.config.appId }),
      );
    } else {
      console.warn('[Monitoring] error', info.message);
    }
  }

  /** 捕获消息 */
  captureMessage(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    this.pushBreadcrumb(`message:${message}`);
    if (this.config.endpoint) {
      navigator.sendBeacon?.(
        this.config.endpoint,
        JSON.stringify({
          type: 'message',
          message,
          level,
          appId: this.config.appId,
          timestamp: Date.now(),
        }),
      );
    }
  }

  /** 埋点事件 */
  track(event: string, properties?: Record<string, unknown>): void {
    const payload: TrackEvent = {
      event,
      properties,
      timestamp: Date.now(),
      userId: this.config.userId,
    };
    this.pushBreadcrumb(`track:${event}`);
    if (this.config.endpoint) {
      navigator.sendBeacon?.(this.config.endpoint, JSON.stringify(payload));
    }
  }

  /** 设置用户 */
  setUser(userId: string): void {
    this.config.userId = userId;
  }

  /** 设置标签 */
  setTag(key: string, value: string): void {
    this.tags[key] = value;
  }

  /** Web Vitals 采集 */
  private collectWebVitals(): void {
    // LCP
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        this.track('web_vitals', { metric: 'LCP', value: last.startTime });
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      /* ignore */
    }
    // CLS
    try {
      new PerformanceObserver((list) => {
        let cls = 0;
        list.getEntries().forEach((entry) => {
          if (!(entry as { hadRecentInput?: boolean }).hadRecentInput) {
            cls += (entry as { value?: number }).value ?? 0;
          }
        });
        this.track('web_vitals', { metric: 'CLS', value: cls });
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {
      /* ignore */
    }
  }

  /** 自定义性能指标 */
  performance(metric: string, value: number): void {
    this.track('performance', { metric, value });
  }

  private pushBreadcrumb(msg: string): void {
    this.breadcrumbs.push(`${Date.now()}:${msg}`);
    if (this.breadcrumbs.length > 50) this.breadcrumbs.shift();
  }
}

export const monitoring = new MonitoringSDK();
export type { MonitoringConfig, ErrorInfo, TrackEvent };
export default MonitoringSDK;
