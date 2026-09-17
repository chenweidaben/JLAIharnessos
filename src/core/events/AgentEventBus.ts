/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

import type { AgentEvent, AgentEventType } from '@/types';

/**
 * 事件订阅回调
 */
export type AgentEventHandler = (event: AgentEvent) => void;

/** 订阅句柄，用于取消订阅 */
export interface Subscription {
  /** 取消订阅 */
  unsubscribe(): void;
}

/**
 * Agent 事件总线
 *
 * 基于发布/订阅模式，串联 Agent 主循环与 UI 层。
 * - UI 层订阅事件进行流式渲染与状态展示；
 * - 调试工具订阅事件进行回放与审计；
 * - 事件历史保留最近 N 条，供状态恢复与问题排查。
 *
 * 基于 claude-code 事件机制扩展，统一医疗场景下的事件出口。
 *
 * @example
 * ```typescript
 * const bus = new AgentEventBus({ maxHistory: 200 });
 *
 * const sub = bus.on('response_delta', (event) => {
 *   process.stdout.write((event.data as { text: string }).text);
 * });
 *
 * bus.publish({ type: 'response_delta', sessionId, timestamp, data });
 *
 * sub.unsubscribe();
 * ```
 */
export class AgentEventBus {
  /** 按事件类型维护的订阅者表 */
  private readonly subscribers = new Map<AgentEventType, Set<AgentEventHandler>>();

  /** 通配订阅者（接收所有事件） */
  private readonly wildcards = new Set<AgentEventHandler>();

  /** 事件历史（环形缓冲） */
  private readonly history: AgentEvent[] = [];

  /** 历史最大条数 */
  private readonly maxHistory: number;

  /**
   * 创建事件总线实例
   *
   * @param options - 配置项
   * @param options.maxHistory - 事件历史最大保留条数（默认 500）
   */
  constructor(options: { maxHistory?: number } = {}) {
    this.maxHistory = options.maxHistory ?? 500;
  }

  /**
   * 订阅指定类型事件
   *
   * @param type - 事件类型
   * @param handler - 事件处理回调
   * @returns 订阅句柄，调用 unsubscribe 取消订阅
   */
  public on(type: AgentEventType, handler: AgentEventHandler): Subscription {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type)!.add(handler);
    return {
      unsubscribe: () => this.off(type, handler),
    };
  }

  /**
   * 订阅所有事件
   *
   * @param handler - 事件处理回调
   * @returns 订阅句柄
   */
  public onAny(handler: AgentEventHandler): Subscription {
    this.wildcards.add(handler);
    return {
      unsubscribe: () => {
        this.wildcards.delete(handler);
      },
    };
  }

  /**
   * 取消订阅指定类型事件
   *
   * @param type - 事件类型
   * @param handler - 之前注册的处理回调
   */
  public off(type: AgentEventType, handler: AgentEventHandler): void {
    this.subscribers.get(type)?.delete(handler);
  }

  /**
   * 发布事件
   *
   * 事件会同时投递到对应类型订阅者、通配订阅者，并写入历史。
   * 单个订阅者抛错不会影响其他订阅者与主流程。
   *
   * @param event - 待发布事件（timestamp 缺省时自动填充）
   */
  public publish(event: Omit<AgentEvent, 'timestamp'> & { timestamp?: number }): void {
    const fullEvent: AgentEvent = {
      timestamp: event.timestamp ?? Date.now(),
      ...event,
    };

    // 写入历史（环形缓冲）
    this.history.push(fullEvent);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // 投递类型订阅者
    const specific = this.subscribers.get(fullEvent.type);
    if (specific) {
      for (const handler of specific) {
        this.safeInvoke(handler, fullEvent);
      }
    }

    // 投递通配订阅者
    for (const handler of this.wildcards) {
      this.safeInvoke(handler, fullEvent);
    }
  }

  /**
   * 读取事件历史
   *
   * @param filter - 可选过滤条件
   * @param filter.type - 按事件类型过滤
   * @param filter.sessionId - 按会话过滤
   * @param filter.limit - 最多返回条数（从最新往前数）
   * @returns 事件列表（按时间正序）
   */
  public getHistory(
    filter: {
      type?: AgentEventType;
      sessionId?: string;
      limit?: number;
    } = {},
  ): readonly AgentEvent[] {
    let result = this.history;
    if (filter.type) {
      result = result.filter((e) => e.type === filter.type);
    }
    if (filter.sessionId) {
      result = result.filter((e) => e.sessionId === filter.sessionId);
    }
    if (filter.limit && result.length > filter.limit) {
      result = result.slice(result.length - filter.limit);
    }
    return result;
  }

  /**
   * 清空事件历史与订阅
   *
   * 主要用于测试与会话重置。
   */
  public clear(): void {
    this.history.length = 0;
    this.subscribers.clear();
    this.wildcards.clear();
  }

  /**
   * 安全调用订阅者回调，隔离异常
   *
   * @param handler - 回调
   * @param event - 事件
   */
  private safeInvoke(handler: AgentEventHandler, event: AgentEvent): void {
    try {
      handler(event);
    } catch (error) {
      console.error('[AgentEventBus] subscriber error:', error);
    }
  }
}
