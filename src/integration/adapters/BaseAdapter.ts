/**
 * 健澜科技数智医院智能体 - integration/adapters/BaseAdapter.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 适配器基类
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 提供统一的适配器基础能力：连接管理、认证、指数退避重试、
 * 滑动窗口熔断器、日志、健康检查、生命周期管理。
 *
 * @module integration/adapters/BaseAdapter
 */

import type {
  AdapterExecutionContext,
  AdapterHealth,
  AdapterMetadata,
  AdapterStatus,
} from '../types';
import type { AdapterConfig } from './AdapterConfig';
import { AdapterError, AdapterErrorCode, AdapterErrorType } from './AdapterError';

// ============================================================
// 熔断器状态
// ============================================================

/** 熔断器状态 */
type CircuitState = 'closed' | 'open' | 'half_open';

/** 滑动窗口统计 */
interface WindowStats {
  /** 窗口内的请求结果（true=成功，false=失败） */
  results: boolean[];
  /** 窗口起始时间 */
  windowStart: number;
}

// ============================================================
// 适配器日志接口（轻量级，避免引入外部日志依赖）
// ============================================================

/** 适配器日志器 */
export interface AdapterLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/** 默认控制台日志器 */
const defaultLogger: AdapterLogger = {
  debug: (msg, meta) => {
    if (process.env.ADAPTER_DEBUG) {
      console.debug(`[Adapter][DEBUG] ${msg}`, meta ?? '');
    }
  },
  info: (msg, meta) => console.info(`[Adapter][INFO] ${msg}`, meta ?? ''),
  warn: (msg, meta) => console.warn(`[Adapter][WARN] ${msg}`, meta ?? ''),
  error: (msg, meta) => console.error(`[Adapter][ERROR] ${msg}`, meta ?? ''),
};

// ============================================================
// BaseAdapter
// ============================================================

/**
 * 适配器基类
 *
 * 所有系统适配器（HIS/EMR/LIS/PACS等）均继承此类，
 * 获得统一的连接管理、认证、重试、熔断、日志能力。
 *
 * 适配器生命周期：init → connect → execute → disconnect
 *
 * @typeParam C - 适配器配置类型，默认为 AdapterConfig
 */
export abstract class BaseAdapter<C extends AdapterConfig = AdapterConfig> {
  /** 适配器配置 */
  protected readonly config: C;
  /** 适配器状态 */
  protected _status: AdapterStatus = 'uninitialized';
  /** 日志器 */
  protected readonly logger: AdapterLogger;
  /** 认证令牌（运行时） */
  protected authToken?: string;
  /** 令牌过期时间 */
  protected tokenExpiresAt?: number;

  // 熔断器状态
  private circuitState: CircuitState = 'closed';
  private circuitOpenedAt = 0;
  private windowStats: WindowStats = { results: [], windowStart: Date.now() };
  private halfOpenSuccessCount = 0;

  // 请求统计
  private totalRequests = 0;
  private successCount = 0;
  private failureCount = 0;
  private totalResponseTimeMs = 0;

  /**
   * 构造函数
   *
   * @param config - 适配器配置
   * @param logger - 可选的自定义日志器
   */
  constructor(config: C, logger?: AdapterLogger) {
    this.config = config;
    this.logger = logger ?? defaultLogger;
  }

  // ============================================================
  // 元信息
  // ============================================================

  /** 获取适配器元信息 */
  abstract getMetadata(): AdapterMetadata;

  /** 适配器ID */
  get id(): string {
    return this.config.id;
  }

  /** 适配器状态 */
  get status(): AdapterStatus {
    return this._status;
  }

  // ============================================================
  // 生命周期
  // ============================================================

  /**
   * 初始化适配器
   *
   * 加载配置、初始化资源，但不建立连接。
   */
  async init(): Promise<void> {
    if (this._status !== 'uninitialized') {
      return;
    }
    this._status = 'initializing';
    this.logger.info(`适配器 [${this.id}] 开始初始化`, {
      vendor: this.config.vendor,
      version: this.config.version,
    });
    try {
      await this.onInit();
      this._status = 'ready';
      this.logger.info(`适配器 [${this.id}] 初始化完成`);
    } catch (error) {
      this._status = 'error';
      this.logger.error(`适配器 [${this.id}] 初始化失败`, { error });
      throw AdapterError.from(error, this.id);
    }
  }

  /**
   * 建立连接
   *
   * 与外部系统建立连接，获取认证令牌。
   */
  async connect(): Promise<void> {
    if (this._status === 'connected') {
      return;
    }
    if (this._status === 'uninitialized') {
      await this.init();
    }
    this._status = 'connecting';
    this.logger.info(`适配器 [${this.id}] 正在建立连接`, { endpoint: this.config.endpoint });
    try {
      // 认证
      if (this.config.auth.type !== 'none') {
        await this.authenticate();
      }
      await this.onConnect();
      this._status = 'connected';
      this.logger.info(`适配器 [${this.id}] 连接已建立`);
    } catch (error) {
      this._status = 'error';
      this.logger.error(`适配器 [${this.id}] 连接失败`, { error });
      throw AdapterError.from(error, this.id);
    }
  }

  /**
   * 断开连接
   *
   * 释放连接资源，清除认证令牌。
   */
  async disconnect(): Promise<void> {
    if (this._status === 'disconnected' || this._status === 'uninitialized') {
      return;
    }
    this.logger.info(`适配器 [${this.id}] 正在断开连接`);
    try {
      await this.onDisconnect();
    } catch (error) {
      this.logger.warn(`适配器 [${this.id}] 断开连接时发生错误`, { error });
    } finally {
      this.authToken = undefined;
      this.tokenExpiresAt = undefined;
      this._status = 'disconnected';
      this.logger.info(`适配器 [${this.id}] 已断开连接`);
    }
  }

  // ============================================================
  // 子类扩展点
  // ============================================================

  /** 初始化扩展点 */
  protected async onInit(): Promise<void> {
    // 默认空实现，子类可覆盖
  }

  /** 连接扩展点 */
  protected async onConnect(): Promise<void> {
    // 默认空实现，子类可覆盖
  }

  /** 断开连接扩展点 */
  protected async onDisconnect(): Promise<void> {
    // 默认空实现，子类可覆盖
  }

  /**
   * 认证
   *
   * 根据配置的认证类型获取认证令牌。
   * 子类可覆盖此方法实现特定认证流程。
   */
  protected async authenticate(): Promise<void> {
    const { auth } = this.config;
    this.logger.debug(`适配器 [${this.id}] 开始认证`, { authType: auth.type });

    switch (auth.type) {
      case 'apiKey':
        // API Key 在请求头中使用，无需预认证
        this.authToken = auth.apiKey;
        break;
      case 'bearer':
        this.authToken = auth.token;
        break;
      case 'basic':
        // basic 认证在请求时编码，无需预获取
        break;
      case 'oauth2':
        await this.authenticateOAuth2();
        break;
      case 'custom':
      case 'none':
      default:
        break;
    }
  }

  /**
   * OAuth2 客户端凭证认证
   *
   * TODO: 实际项目中使用 axios 调用 tokenUrl 获取令牌。
   * 此处为骨架实现，子类可覆盖。
   */
  protected async authenticateOAuth2(): Promise<void> {
    const { auth } = this.config;
    if (!auth.tokenUrl || !auth.clientId || !auth.clientSecret) {
      throw AdapterError.authentication(
        'OAuth2 配置不完整：缺少 tokenUrl/clientId/clientSecret',
        AdapterErrorCode.INVALID_CREDENTIALS,
        { adapterId: this.id },
      );
    }
    // 骨架：实际实现中调用 tokenUrl 获取 access_token
    // const response = await axios.post(auth.tokenUrl, ...);
    // this.authToken = response.data.access_token;
    // this.tokenExpiresAt = Date.now() + response.data.expires_in * 1000;
    this.logger.warn(`适配器 [${this.id}] OAuth2 认证为骨架实现，请在子类中完成实际令牌获取`);
  }

  /**
   * 构建认证请求头
   *
   * @returns 认证相关的 HTTP 头
   */
  protected buildAuthHeaders(): Record<string, string> {
    const { auth } = this.config;
    const headers: Record<string, string> = {};

    switch (auth.type) {
      case 'apiKey': {
        const headerName = auth.apiKeyHeader ?? 'X-API-Key';
        headers[headerName] = auth.apiKey ?? '';
        break;
      }
      case 'bearer':
        headers.Authorization = `Bearer ${this.authToken ?? auth.token ?? ''}`;
        break;
      case 'basic': {
        const credentials = Buffer.from(`${auth.username ?? ''}:${auth.password ?? ''}`).toString(
          'base64',
        );
        headers.Authorization = `Basic ${credentials}`;
        break;
      }
      case 'oauth2':
        if (this.authToken) {
          headers.Authorization = `Bearer ${this.authToken}`;
        }
        break;
      case 'custom':
        if (auth.customHeaders) {
          Object.assign(headers, auth.customHeaders);
        }
        break;
      case 'none':
      default:
        break;
    }

    return headers;
  }

  // ============================================================
  // 执行封装（重试 + 熔断 + 超时 + 统计）
  // ============================================================

  /**
   * 执行适配器操作（带重试、熔断、超时）
   *
   * @typeParam T - 返回值类型
   * @param operation - 实际操作函数
   * @param context - 执行上下文
   * @returns 操作结果
   * @throws {AdapterError} 操作失败时抛出
   */
  protected async execute<T>(
    operation: (attempt: number) => Promise<T>,
    context: AdapterExecutionContext = {},
  ): Promise<T> {
    // 检查适配器状态
    this.ensureReady();

    // 检查熔断器
    this.checkCircuitBreaker();

    const maxRetries = context.retries ?? this.config.retry.maxRetries;
    const timeout = context.timeout ?? this.config.timeout;
    const requestId = context.requestId ?? this.generateRequestId();

    let lastError: AdapterError | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      try {
        const result = await this.withTimeout<T>(() => operation(attempt), timeout, requestId);

        // 记录成功
        this.recordSuccess(Date.now() - startTime);
        this.onSuccess(attempt, requestId);
        return result;
      } catch (error) {
        const adapterError =
          error instanceof AdapterError ? error : AdapterError.from(error, this.id);

        lastError = adapterError;
        const duration = Date.now() - startTime;
        this.recordFailure(duration);

        this.logger.warn(`适配器 [${this.id}] 请求失败`, {
          requestId,
          attempt: attempt + 1,
          maxRetries,
          errorCode: adapterError.code,
          errorType: adapterError.errorType,
          message: adapterError.message,
          durationMs: duration,
        });

        // 判断是否可重试
        if (attempt >= maxRetries || !adapterError.retryable) {
          break;
        }

        // 指数退避等待
        const delay = this.calculateBackoffDelay(attempt);
        this.logger.debug(`适配器 [${this.id}] 等待 ${delay}ms 后重试`, { requestId, attempt });
        await this.sleep(delay);
      }
    }

    throw (
      lastError ??
      new AdapterError(AdapterErrorType.UNKNOWN, AdapterErrorCode.UNKNOWN_ERROR, '未知错误', {
        adapterId: this.id,
        requestId,
      })
    );
  }

  /**
   * 确保适配器已就绪（已初始化且已连接）
   */
  protected ensureReady(): void {
    if (this._status === 'uninitialized') {
      throw new AdapterError(
        AdapterErrorType.UNKNOWN,
        AdapterErrorCode.ADAPTER_NOT_INITIALIZED,
        `适配器 [${this.id}] 尚未初始化，请先调用 init()`,
        { adapterId: this.id, retryable: false },
      );
    }
    if (this._status !== 'connected' && this._status !== 'ready') {
      throw new AdapterError(
        AdapterErrorType.UNKNOWN,
        AdapterErrorCode.ADAPTER_NOT_CONNECTED,
        `适配器 [${this.id}] 未连接（当前状态：${this._status}），请先调用 connect()`,
        { adapterId: this.id, retryable: true },
      );
    }
  }

  // ============================================================
  // 熔断器（滑动窗口）
  // ============================================================

  /**
   * 检查熔断器状态，若打开则拒绝请求
   */
  private checkCircuitBreaker(): void {
    if (!this.config.circuitBreaker.enabled) {
      return;
    }

    if (this.circuitState === 'open') {
      const elapsed = Date.now() - this.circuitOpenedAt;
      if (elapsed >= this.config.circuitBreaker.openDurationMs) {
        // 进入半开状态
        this.circuitState = 'half_open';
        this.halfOpenSuccessCount = 0;
        this.logger.info(`适配器 [${this.id}] 熔断器进入半开状态`);
      } else {
        throw AdapterError.circuitBreaker(
          `熔断器已打开，剩余 ${Math.ceil((this.config.circuitBreaker.openDurationMs - elapsed) / 1000)} 秒`,
          { adapterId: this.id },
        );
      }
    }
  }

  /**
   * 记录成功请求，更新熔断器状态
   */
  private recordSuccess(durationMs: number): void {
    this.totalRequests++;
    this.successCount++;
    this.totalResponseTimeMs += durationMs;

    if (!this.config.circuitBreaker.enabled) {
      return;
    }

    // 半开状态：成功计数
    if (this.circuitState === 'half_open') {
      this.halfOpenSuccessCount++;
      if (this.halfOpenSuccessCount >= this.config.circuitBreaker.halfOpenRequests) {
        this.circuitState = 'closed';
        this.resetWindow();
        this.logger.info(`适配器 [${this.id}] 熔断器已关闭（恢复正常）`);
      }
    }

    // 滑动窗口记录成功
    this.addToWindow(true);
  }

  /**
   * 记录失败请求，更新熔断器状态
   */
  private recordFailure(durationMs: number): void {
    this.totalRequests++;
    this.failureCount++;
    this.totalResponseTimeMs += durationMs;

    if (!this.config.circuitBreaker.enabled) {
      return;
    }

    // 半开状态：任意失败立即打开
    if (this.circuitState === 'half_open') {
      this.openCircuit();
      return;
    }

    // 滑动窗口记录失败
    this.addToWindow(false);
    this.evaluateCircuitBreaker();
  }

  /**
   * 添加请求结果到滑动窗口
   */
  private addToWindow(success: boolean): void {
    const now = Date.now();
    const windowSize = this.config.circuitBreaker.windowSize;

    // 窗口滚动：移除过期条目（简化实现：按数量滑动）
    this.windowStats.results.push(success);
    if (this.windowStats.results.length > windowSize) {
      this.windowStats.results.shift();
    }
    this.windowStats.windowStart = now;
  }

  /**
   * 评估是否需要打开熔断器
   */
  private evaluateCircuitBreaker(): void {
    const { minimumRequests, failureThreshold } = this.config.circuitBreaker;
    const results = this.windowStats.results;

    if (results.length < minimumRequests) {
      return;
    }

    const failures = results.filter((r) => !r).length;
    const failureRate = (failures / results.length) * 100;

    if (failureRate >= failureThreshold) {
      this.openCircuit();
    }
  }

  /**
   * 打开熔断器
   */
  private openCircuit(): void {
    this.circuitState = 'open';
    this.circuitOpenedAt = Date.now();
    this.logger.warn(`适配器 [${this.id}] 熔断器已打开`, {
      failureRate: this.getCurrentFailureRate(),
      windowSize: this.windowStats.results.length,
    });
  }

  /**
   * 重置滑动窗口
   */
  private resetWindow(): void {
    this.windowStats = { results: [], windowStart: Date.now() };
  }

  /**
   * 获取当前失败率
   */
  private getCurrentFailureRate(): number {
    const results = this.windowStats.results;
    if (results.length === 0) return 0;
    const failures = results.filter((r) => !r).length;
    return (failures / results.length) * 100;
  }

  // ============================================================
  // 重试退避
  // ============================================================

  /**
   * 计算指数退避延迟
   *
   * @param attempt - 当前尝试次数（0-based）
   * @returns 延迟毫秒数
   */
  private calculateBackoffDelay(attempt: number): number {
    const { initialDelayMs, maxDelayMs, backoffFactor, jitter } = this.config.retry;
    let delay = initialDelayMs * Math.pow(backoffFactor, attempt);
    delay = Math.min(delay, maxDelayMs);

    if (jitter) {
      // 添加 ±20% 的随机抖动
      const jitterRange = delay * 0.2;
      delay = delay + (Math.random() * 2 - 1) * jitterRange;
    }

    return Math.max(0, Math.floor(delay));
  }

  // ============================================================
  // 超时控制
  // ============================================================

  /**
   * 为操作添加超时控制
   */
  private async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    requestId: string,
  ): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          AdapterError.timeout(`请求超时（${timeoutMs}ms）`, {
            adapterId: this.id,
            requestId,
            retryable: true,
          }),
        );
      }, timeoutMs);
    });

    try {
      return await Promise.race([operation(), timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  // ============================================================
  // 健康检查
  // ============================================================

  /**
   * 健康检查
   *
   * 子类应覆盖此方法，实现实际的健康检查逻辑（如 ping 外部系统）。
   *
   * @returns 健康状态
   */
  async healthCheck(): Promise<AdapterHealth> {
    const healthy = this._status === 'connected' || this._status === 'ready';
    const avgResponseTime =
      this.totalRequests > 0 ? Math.round(this.totalResponseTimeMs / this.totalRequests) : 0;

    return {
      adapterId: this.id,
      adapterType: this.config.type,
      vendor: this.config.vendor,
      status: this._status,
      healthy,
      lastCheckAt: new Date().toISOString(),
      responseTimeMs: avgResponseTime,
      metrics: {
        totalRequests: this.totalRequests,
        successCount: this.successCount,
        failureCount: this.failureCount,
        averageResponseTimeMs: avgResponseTime,
      },
    };
  }

  // ============================================================
  // 工具方法
  // ============================================================

  /** 生成请求ID */
  protected generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  /** 休眠 */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** 成功回调（子类可覆盖用于日志/监控） */
  protected onSuccess(_attempt: number, _requestId: string): void {
    // 默认空实现
  }

  /**
   * 获取熔断器当前状态（用于测试和监控）
   */
  getCircuitState(): CircuitState {
    return this.circuitState;
  }

  /**
   * 重置熔断器（用于测试）
   */
  resetCircuitBreaker(): void {
    this.circuitState = 'closed';
    this.circuitOpenedAt = 0;
    this.resetWindow();
    this.halfOpenSuccessCount = 0;
  }
}
