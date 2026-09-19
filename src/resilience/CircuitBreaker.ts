/**
 * 健澜科技杠OS（jlmedaios）- 熔断器（Circuit Breaker）
 *
 * 面向医院高并发场景：门诊高峰、LIS/PACS 结果批量回推、危急值扇出、HIS 网关调用等。
 * 当下游（集成适配器、外部接口、大模型网关）持续异常时，熔断可快速失败（fail-fast），
 * 避免线程/协程被拖死、故障级联（cascading failure）与数据库连接耗尽。
 *
 * 三态机：
 *   closed    正常放行；统计连续失败与滚动错误率，越阈值则跳闸为 open。
 *   open      直接 fail-fast，不调用下游；冷却 resetTimeoutMs 后进入 half-open。
 *   half-open 放行少量探测请求：探测成功则恢复 closed，任意探测失败则重新 open。
 *
 * 设计要点：
 *   - 纯内存实现，不依赖 Redis/Postgres，进程内零外部依赖；时钟可注入便于测试。
 *   - 所有受控错误统一为 MedicalAgentError，便于上层审计与降级。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { MedicalAgentError } from '../core/errors/index.js';

/** 熔断状态 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/** 韧性层专用错误码（不改动 core/errors 的既有常量集合） */
export const ResilienceErrorCodes = {
  /** 熔断器打开，快速失败 */
  CIRCUIT_OPEN: 'RESILIENCE_CIRCUIT_OPEN',
  /** 半开探测槽位已满，稍后重试 */
  CIRCUIT_HALF_OPEN_BUSY: 'RESILIENCE_CIRCUIT_HALF_OPEN_BUSY',
  /** 下游调用超时 */
  CIRCUIT_TIMEOUT: 'RESILIENCE_CIRCUIT_TIMEOUT',
  /** 舱壁隔离触发拒绝 */
  BULKHEAD_REJECTED: 'RESILIENCE_BULKHEAD_REJECTED',
  /** 并发信号量获取超时 */
  CONCURRENCY_TIMEOUT: 'RESILIENCE_CONCURRENCY_TIMEOUT',
  /** 异步队列已满且策略为拒绝 */
  QUEUE_REJECTED: 'RESILIENCE_QUEUE_REJECTED',
  /** 限流触发 */
  RATE_LIMITED: 'RESILIENCE_RATE_LIMITED',
} as const;

export interface CircuitBreakerOptions {
  /** 熔断器名称（用于指标/审计），如 his-gateway、lab-query */
  name: string;
  /** 连续失败达到该值即跳闸为 open，默认 5 */
  failureThreshold?: number;
  /** 滚动窗口错误率阈值（0~1），需配合 minimumCalls，默认 0.5 */
  errorRateThreshold?: number;
  /** 触发错误率判定所需的最小调用样本数，默认 10 */
  minimumCalls?: number;
  /** 熔断冷却时间（毫秒），到期后自动进入 half-open，默认 30000 */
  resetTimeoutMs?: number;
  /** 半开状态允许的最大在途探测请求数，默认 3 */
  halfOpenMaxProbes?: number;
  /** 单次执行超时（毫秒），<=0 表示不启用，默认 0 */
  timeoutMs?: number;
  /**
   * 判定某次结果是否"算失败"。默认所有抛出都算失败。
   * 可用于把"业务上的可接受失败"（如查无此患者）排除在熔断统计之外。
   */
  isFailure?: (err: unknown) => boolean;
  /** 时钟注入（毫秒时间戳），默认 Date.now；测试可注入虚拟时钟 */
  now?: () => number;
}

/** 熔断器实时快照指标 */
export interface CircuitMetrics {
  name: string;
  state: CircuitState;
  /** 最近滚动窗口内的调用总数 */
  total: number;
  /** 最近滚动窗口内的失败数 */
  failures: number;
  /** 滚动错误率（0~1），样本不足时为 0 */
  errorRate: number;
  /** 当前连续失败数 */
  consecutiveFailures: number;
  /** 累计因熔断被快速拒绝的次数 */
  rejected: number;
  /** 累计成功次数 */
  successes: number;
  /** open 起始时间戳（open 态才有意义） */
  openedAt: number;
  /** 当前半开在途探测数 */
  halfOpenProbes: number;
  /** 最近一次失败时间戳（无则 0） */
  lastFailureAt: number;
}

/** 滚动窗口结果样本（保留最近 N 次用于错误率统计） */
interface Outcome {
  ok: boolean;
}

const RECENT_WINDOW = 200;

export class CircuitBreaker {
  private readonly opts: Required<Pick<
    CircuitBreakerOptions,
    'name' | 'failureThreshold' | 'errorRateThreshold' | 'minimumCalls' |
    'resetTimeoutMs' | 'halfOpenMaxProbes' | 'timeoutMs' | 'now'
  >> & { isFailure: (err: unknown) => boolean };

  private state: CircuitState = 'closed';
  private openedAt = 0;
  private consecutiveFailures = 0;
  private rejected = 0;
  private successes = 0;
  private halfOpenProbes = 0;
  private lastFailureAt = 0;
  /** 最近调用结果环形缓冲（错误率统计） */
  private readonly recent: Outcome[] = [];

  constructor(options: CircuitBreakerOptions) {
    this.opts = {
      name: options.name,
      failureThreshold: options.failureThreshold ?? 5,
      errorRateThreshold: options.errorRateThreshold ?? 0.5,
      minimumCalls: options.minimumCalls ?? 10,
      resetTimeoutMs: options.resetTimeoutMs ?? 30_000,
      halfOpenMaxProbes: options.halfOpenMaxProbes ?? 3,
      timeoutMs: options.timeoutMs ?? 0,
      now: options.now ?? (() => Date.now()),
      isFailure: options.isFailure ?? (() => true),
    };
  }

  /** 当前状态（可能因冷却到期而惰性跃迁为 half-open） */
  getState(): CircuitState {
    this.maybeTripHalfOpen();
    return this.state;
  }

  /** 当前是否允许调用（不改变状态，仅观测） */
  canExecute(): boolean {
    this.maybeTripHalfOpen();
    if (this.state === 'open') return false;
    if (this.state === 'half-open') return this.halfOpenProbes < this.opts.halfOpenMaxProbes;
    return true;
  }

  /** 重置为 closed（运维/手动恢复用） */
  reset(): void {
    this.transitionTo('closed');
    this.consecutiveFailures = 0;
    this.halfOpenProbes = 0;
    this.recent.length = 0;
  }

  /**
   * 包裹一个可能失败的异步下游调用。
   * 熔断打开时直接抛出受控错误，不执行 fn。
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.maybeTripHalfOpen();

    if (this.state === 'open') {
      this.rejected++;
      throw new MedicalAgentError(
        ResilienceErrorCodes.CIRCUIT_OPEN,
        `熔断器[${this.opts.name}]处于打开状态，快速失败`,
        { name: this.opts.name, retryAfterMs: this.retryAfterMs() },
      );
    }

    if (this.state === 'half-open') {
      if (this.halfOpenProbes >= this.opts.halfOpenMaxProbes) {
        this.rejected++;
        throw new MedicalAgentError(
          ResilienceErrorCodes.CIRCUIT_HALF_OPEN_BUSY,
          `熔断器[${this.opts.name}]半开探测槽位已满`,
          { name: this.opts.name, probes: this.halfOpenProbes },
        );
      }
      this.halfOpenProbes++;
    }

    try {
      const value = await this.runWithTimeout(fn);
      this.recordSuccess();
      return value;
    } catch (err) {
      this.recordFailure(err);
      throw err;
    }
  }

  /** 快照指标（供监控/压测/管理台读取） */
  getMetrics(): CircuitMetrics {
    const total = this.recent.length;
    const failures = this.recent.filter((o) => !o.ok).length;
    return {
      name: this.opts.name,
      state: this.state,
      total,
      failures,
      errorRate: total >= this.opts.minimumCalls ? failures / total : 0,
      consecutiveFailures: this.consecutiveFailures,
      rejected: this.rejected,
      successes: this.successes,
      openedAt: this.openedAt,
      halfOpenProbes: this.halfOpenProbes,
      lastFailureAt: this.lastFailureAt,
    };
  }

  // ---------------- 内部实现 ----------------

  private runWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    if (this.opts.timeoutMs <= 0) return fn();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new MedicalAgentError(
            ResilienceErrorCodes.CIRCUIT_TIMEOUT,
            `熔断器[${this.opts.name}]下游调用超时（>${this.opts.timeoutMs}ms）`,
            { name: this.opts.name, timeoutMs: this.opts.timeoutMs },
          ),
        );
      }, this.opts.timeoutMs);
      // 避免悬挂句柄阻止进程退出
      if (typeof timer === 'object' && 'unref' in timer) {
        (timer as unknown as { unref: () => void }).unref();
      }
    });
    return Promise.race([fn(), timeout]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  private recordSuccess(): void {
    this.pushOutcome(true);
    this.successes++;
    this.consecutiveFailures = 0;
    if (this.state === 'half-open') {
      // 探测成功：恢复正常
      this.transitionTo('closed');
      this.halfOpenProbes = 0;
    }
  }

  private recordFailure(err: unknown): void {
    this.lastFailureAt = this.opts.now();
    // 业务上"可接受的失败"不计入熔断统计
    if (!this.opts.isFailure(err)) return;

    this.pushOutcome(false);
    this.consecutiveFailures++;

    if (this.state === 'half-open') {
      // 探测失败：立即重新打开
      this.transitionTo('open');
      this.halfOpenProbes = 0;
      return;
    }

    // closed 态：判断是否需要跳闸
    if (this.shouldTrip()) {
      this.transitionTo('open');
    }
  }

  private pushOutcome(ok: boolean): void {
    this.recent.push({ ok });
    if (this.recent.length > RECENT_WINDOW) this.recent.shift();
  }

  private shouldTrip(): boolean {
    if (this.consecutiveFailures >= this.opts.failureThreshold) return true;
    const total = this.recent.length;
    if (total < this.opts.minimumCalls) return false;
    const failures = this.recent.filter((o) => !o.ok).length;
    return failures / total >= this.opts.errorRateThreshold;
  }

  /** 冷却到期则从 open 跃迁为 half-open（惰性触发） */
  private maybeTripHalfOpen(): void {
    if (this.state !== 'open') return;
    if (this.opts.now() - this.openedAt >= this.opts.resetTimeoutMs) {
      this.transitionTo('half-open');
      this.halfOpenProbes = 0;
    }
  }

  private transitionTo(next: CircuitState): void {
    if (this.state === next) return;
    this.state = next;
    if (next === 'open') this.openedAt = this.opts.now();
  }

  private retryAfterMs(): number {
    const elapsed = this.opts.now() - this.openedAt;
    return Math.max(0, this.opts.resetTimeoutMs - elapsed);
  }
}
