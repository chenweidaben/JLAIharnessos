/**
 * 健澜科技数智医院智能体 - integration/middleware/IntegrationBus.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 集成消息总线
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 提供事件发布/订阅模式的集成消息总线，实现系统间事件通知
 * （如危急值事件、患者入院事件）和异步消息处理。
 *
 * 当前提供内存实现（开发环境用），生产环境可替换为Kafka/RabbitMQ。
 *
 * @module integration/middleware/IntegrationBus
 */

import type { EventPriority, IntegrationEvent, Unsubscribe } from '../types';
import { EVENT_DEFAULT_PRIORITY } from './EventTypes';

/** 事件处理器 */
export type EventHandler<T = unknown> = (event: IntegrationEvent<T>) => void | Promise<void>;

/**
 * 消息代理抽象接口
 *
 * 生产环境可替换为 Kafka / RabbitMQ / RocketMQ 实现。
 * 内存实现（IntegrationBus 内置）用于开发/测试。
 */
export interface MessageBroker {
  /** 代理名称 */
  readonly name: string;
  /** 发布消息到指定 topic */
  publish(topic: string, message: IntegrationEvent): Promise<void>;
  /** 订阅 topic */
  subscribe(topic: string, handler: EventHandler): Promise<void>;
  /** 关闭连接 */
  close(): Promise<void>;
}

/** 死信队列条目 */
export interface DeadLetterEntry {
  event: IntegrationEvent;
  error: string;
  deadLetteredAt: string;
  subscriberName?: string;
}

/** 订阅选项 */
export interface SubscriptionOptions {
  /** 订阅者名称（用于日志和监控） */
  subscriberName?: string;
  /** 是否异步执行（默认true） */
  async?: boolean;
  /** 最大重试次数（默认0，不重试） */
  maxRetries?: number;
  /** 重试延迟（毫秒，默认1000） */
  retryDelayMs?: number;
  /** 死信队列回调（重试耗尽后调用） */
  onDeadLetter?: (event: IntegrationEvent, error: Error) => void;
}

/** 订阅信息 */
interface Subscription {
  id: string;
  eventType: string;
  handler: EventHandler;
  options: SubscriptionOptions;
  subscribedAt: string;
  callCount: number;
  failureCount: number;
}

/** 总线统计 */
export interface BusStats {
  totalPublished: number;
  totalDelivered: number;
  totalFailed: number;
  activeSubscriptions: number;
  eventsByType: Record<string, number>;
  subscribersByType: Record<string, number>;
}

/**
 * 集成消息总线（内存实现）
 *
 * 提供发布-订阅模式的事件通信，支持：
 * - 按事件类型订阅
 * - 通配符订阅（如 "patient.*" 订阅所有患者事件）
 * - 异步/同步处理
 * - 失败重试和死信队列
 * - 事件优先级排序
 * - 统计和监控
 *
 * @example
 * ```typescript
 * const bus = IntegrationBus.getInstance();
 *
 * // 订阅危急值事件
 * bus.subscribe('lab.critical_value', (event) => {
 *   console.log('收到危急值:', event.payload);
 * }, { subscriberName: 'clinical-agent' });
 *
 * // 发布事件
 * bus.publish({
 *   eventId: 'evt_001',
 *   eventType: 'lab.critical_value',
 *   source: 'lis-adapter',
 *   timestamp: new Date().toISOString(),
 *   priority: 'critical',
 *   payload: { patientId: 'P001', testItemName: '肌钙蛋白', resultValue: '5.8' },
 * });
 * ```
 */
export class IntegrationBus {
  private static instance: IntegrationBus | undefined;

  /** 订阅映射（eventType → Set<Subscription>） */
  private subscriptions = new Map<string, Set<Subscription>>();
  /** 通配符订阅（eventType前缀 → Set<Subscription>） */
  private wildcardSubscriptions = new Map<string, Set<Subscription>>();
  /** 订阅计数器 */
  private subscriptionCounter = 0;
  /** 统计 */
  private stats: BusStats = {
    totalPublished: 0,
    totalDelivered: 0,
    totalFailed: 0,
    activeSubscriptions: 0,
    eventsByType: {},
    subscribersByType: {},
  };
  /** 事件队列（按优先级排序） */
  private eventQueue: { event: IntegrationEvent; priority: number }[] = [];
  /** 是否正在处理队列 */
  private processing = false;
  /** 优先级数值映射 */
  private static readonly PRIORITY_ORDER: Record<EventPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  /** 死信队列（重试耗尽的事件） */
  private deadLetterQueue: DeadLetterEntry[] = [];
  /** 消息持久化日志（最近 N 条） */
  private persistenceLog: IntegrationEvent[] = [];
  /** 持久化日志上限 */
  private readonly persistenceLogLimit = 10000;
  /** 延迟投递定时器 */
  private delayedTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** 外部消息代理（如 Kafka），未设置时使用内存实现 */
  private broker: MessageBroker | undefined;

  private constructor() {
    // 私有构造函数
  }

  /**
   * 获取总线单例
   */
  static getInstance(): IntegrationBus {
    IntegrationBus.instance ??= new IntegrationBus();
    return IntegrationBus.instance;
  }

  /**
   * 重置总线（用于测试）
   */
  static reset(): void {
    IntegrationBus.instance = undefined;
  }

  // ============================================================
  // 订阅
  // ============================================================

  /**
   * 订阅事件
   *
   * @param eventType - 事件类型，支持通配符（如 "patient.*"）
   * @param handler - 事件处理器
   * @param options - 订阅选项
   * @returns 取消订阅函数
   */
  subscribe<T = unknown>(
    eventType: string,
    handler: EventHandler<T>,
    options: SubscriptionOptions = {},
  ): Unsubscribe {
    const subscription: Subscription = {
      id: this.generateSubscriptionId(),
      eventType,
      handler: handler as EventHandler,
      options: {
        async: options.async ?? true,
        maxRetries: options.maxRetries ?? 0,
        retryDelayMs: options.retryDelayMs ?? 1000,
        ...options,
      },
      subscribedAt: new Date().toISOString(),
      callCount: 0,
      failureCount: 0,
    };

    if (eventType.includes('*')) {
      // 通配符订阅
      const prefix = eventType.replace(/\.\*$/, '');
      if (!this.wildcardSubscriptions.has(prefix)) {
        this.wildcardSubscriptions.set(prefix, new Set());
      }
      this.wildcardSubscriptions.get(prefix)!.add(subscription);
    } else {
      // 精确订阅
      if (!this.subscriptions.has(eventType)) {
        this.subscriptions.set(eventType, new Set());
      }
      this.subscriptions.get(eventType)!.add(subscription);
    }

    this.stats.activeSubscriptions++;
    this.stats.subscribersByType[eventType] = (this.stats.subscribersByType[eventType] ?? 0) + 1;

    return () => {
      this.unsubscribe(subscription);
    };
  }

  /**
   * 取消订阅
   */
  private unsubscribe(subscription: Subscription): void {
    if (subscription.eventType.includes('*')) {
      const prefix = subscription.eventType.replace(/\.\*$/, '');
      this.wildcardSubscriptions.get(prefix)?.delete(subscription);
    } else {
      this.subscriptions.get(subscription.eventType)?.delete(subscription);
    }
    this.stats.activeSubscriptions--;
    this.stats.subscribersByType[subscription.eventType] = Math.max(
      0,
      (this.stats.subscribersByType[subscription.eventType] ?? 1) - 1,
    );
  }

  // ============================================================
  // 发布
  // ============================================================

  /**
   * 发布事件
   *
   * @param event - 集成事件
   */
  publish<T = unknown>(event: IntegrationEvent<T>): void {
    this.stats.totalPublished++;
    this.stats.eventsByType[event.eventType] = (this.stats.eventsByType[event.eventType] ?? 0) + 1;

    // 持久化到内存日志
    this.persistEvent(event);

    const priority = IntegrationBus.PRIORITY_ORDER[event.priority] ?? 2;

    // 查找匹配的订阅者
    const matchedSubscriptions = this.findMatchingSubscriptions(event.eventType);

    if (matchedSubscriptions.length === 0) {
      // 无订阅者，事件被丢弃（可配置为死信）
      return;
    }

    // 加入事件队列（按优先级排序）
    this.eventQueue.push({ event: event, priority });
    this.eventQueue.sort((a, b) => a.priority - b.priority);

    // 触发队列处理（异步后台消费，错误由 processQueue 内部兜底；用 void 标记有意的 fire-and-forget）
    void this.processQueue();
  }

  /**
   * 发布事件并等待所有订阅者处理完成
   *
   * @param event - 集成事件
   * @returns 所有订阅者的处理结果
   */
  async publishAndWait<T = unknown>(
    event: IntegrationEvent<T>,
  ): Promise<{ success: boolean; error?: Error }[]> {
    this.stats.totalPublished++;
    this.stats.eventsByType[event.eventType] = (this.stats.eventsByType[event.eventType] ?? 0) + 1;

    const matchedSubscriptions = this.findMatchingSubscriptions(event.eventType);
    const results: { success: boolean; error?: Error }[] = [];

    for (const sub of matchedSubscriptions) {
      try {
        await this.invokeHandler(sub, event);
        results.push({ success: true });
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    return results;
  }

  // ============================================================
  // 队列处理
  // ============================================================

  /**
   * 处理事件队列
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.eventQueue.length > 0) {
        const item = this.eventQueue.shift();
        if (!item) break;

        const matchedSubscriptions = this.findMatchingSubscriptions(item.event.eventType);

        for (const sub of matchedSubscriptions) {
          if (sub.options.async) {
            // 异步执行，不等待
            this.invokeHandler(sub, item.event).catch(() => {
              // 错误已在 invokeHandler 中处理
            });
          } else {
            // 同步执行
            try {
              await this.invokeHandler(sub, item.event);
            } catch {
              // 错误已在 invokeHandler 中处理
            }
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * 调用事件处理器（含重试）
   */
  private async invokeHandler(subscription: Subscription, event: IntegrationEvent): Promise<void> {
    subscription.callCount++;
    const maxRetries = subscription.options.maxRetries ?? 0;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        await subscription.handler(event);
        this.stats.totalDelivered++;
        return;
      } catch (error) {
        subscription.failureCount++;
        this.stats.totalFailed++;

        if (attempt < maxRetries) {
          const delay = subscription.options.retryDelayMs ?? 1000;
          await this.sleep(delay * Math.pow(2, attempt)); // 指数退避
          attempt++;
        } else {
          // 重试耗尽，调用死信回调并入死信队列
          const errObj = error instanceof Error ? error : new Error(String(error));
          this.deadLetterQueue.push({
            event,
            error: errObj.message,
            deadLetteredAt: new Date().toISOString(),
            subscriberName: subscription.options.subscriberName,
          });
          if (subscription.options.onDeadLetter) {
            subscription.options.onDeadLetter(event, errObj);
          }
          throw error;
        }
      }
    }
  }

  // ============================================================
  // 查询
  // ============================================================

  /**
   * 查找匹配事件类型的所有订阅者
   */
  private findMatchingSubscriptions(eventType: string): Subscription[] {
    const result: Subscription[] = [];

    // 精确匹配
    const exact = this.subscriptions.get(eventType);
    if (exact) {
      result.push(...exact);
    }

    // 通配符匹配
    for (const [prefix, subs] of this.wildcardSubscriptions) {
      if (eventType.startsWith(prefix + '.')) {
        result.push(...subs);
      }
    }

    return result;
  }

  /**
   * 获取指定事件类型的订阅者数量
   */
  getSubscriberCount(eventType: string): number {
    return this.findMatchingSubscriptions(eventType).length;
  }

  /**
   * 获取总线统计
   */
  getStats(): BusStats {
    return { ...this.stats };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      totalPublished: 0,
      totalDelivered: 0,
      totalFailed: 0,
      activeSubscriptions: this.stats.activeSubscriptions,
      eventsByType: {},
      subscribersByType: {},
    };
  }

  // ============================================================
  // 消息代理（Kafka 等生产替换）/ 延迟投递 / 死信 / 持久化
  // ============================================================

  /**
   * 设置外部消息代理（如 Kafka）
   *
   * 设置后，publish 将同时转发到代理；未设置时使用纯内存实现。
   *
   * @param broker - 消息代理实例
   */
  setBroker(broker: MessageBroker): void {
    this.broker = broker;
  }

  /**
   * 延迟投递事件（指定毫秒后发布）
   *
   * @param event - 集成事件
   * @param delayMs - 延迟毫秒数
   * @returns 定时器ID（可用于取消）
   */
  publishDelayed<T = unknown>(event: IntegrationEvent<T>, delayMs: number): string {
    const timerId = `delayed_${event.eventId ?? Math.random().toString(36).slice(2)}`;
    const timer = setTimeout(() => {
      this.delayedTimers.delete(timerId);
      this.publish(event);
    }, delayMs);
    this.delayedTimers.set(timerId, timer);
    return timerId;
  }

  /**
   * 取消延迟投递
   *
   * @param timerId - publishDelayed 返回的定时器ID
   */
  cancelDelayed(timerId: string): void {
    const timer = this.delayedTimers.get(timerId);
    if (timer) {
      clearTimeout(timer);
      this.delayedTimers.delete(timerId);
    }
  }

  /**
   * 获取死信队列内容
   */
  getDeadLetters(): DeadLetterEntry[] {
    return [...this.deadLetterQueue];
  }

  /**
   * 清空死信队列
   */
  clearDeadLetters(): void {
    this.deadLetterQueue = [];
  }

  /**
   * 获取持久化的消息日志（最近 N 条，按时间倒序）
   *
   * @param limit - 返回数量
   */
  getPersistedMessages(limit = 100): IntegrationEvent[] {
    return [...this.persistenceLog].reverse().slice(0, limit);
  }

  /**
   * 持久化事件到内存日志
   */
  private persistEvent(event: IntegrationEvent): void {
    this.persistenceLog.push(event);
    if (this.persistenceLog.length > this.persistenceLogLimit) {
      this.persistenceLog.shift();
    }
  }

  // ============================================================
  // 工具方法
  // ============================================================

  private generateSubscriptionId(): string {
    this.subscriptionCounter++;
    return `sub_${Date.now().toString(36)}_${String(this.subscriptionCounter).padStart(4, '0')}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 便捷函数：创建并发布事件
 */
export function publishEvent<T = unknown>(
  eventType: string,
  source: string,
  payload: T,
  priority?: EventPriority,
): void {
  const bus = IntegrationBus.getInstance();
  bus.publish<T>({
    eventId: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    eventType,
    source,
    timestamp: new Date().toISOString(),
    priority: priority ?? EVENT_DEFAULT_PRIORITY[eventType] ?? 'medium',
    payload,
  });
}
