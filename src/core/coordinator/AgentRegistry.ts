/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * Agent 注册中心（AgentRegistry）
 * 负责智能体注册/注销、按能力/层级查询、实例池与负载状态管理。
 * 对应设计文档：02-Agent能力与医疗工具设计 §1.8.1 第2层能力匹配、第3层负载均衡。
 */

import type { AgentLayer, AgentLoad, CapabilityTag, ExecutableAgent } from './types';

/**
 * Agent 注册中心
 *
 * 进程内单例注册表，维护所有可被调度的 Agent 实例及其运行时负载。
 * 线程安全（单进程异步模型，操作同步完成）。
 *
 * @example
 * ```typescript
 * const registry = new AgentRegistry();
 * registry.register(adsAgent);
 * const candidates = registry.findByCapability('record_writing');
 * const chosen = registry.pickLeastLoaded(candidates.map((a) => a.name));
 * ```
 */
export class AgentRegistry {
  /** name -> Agent 实例 */
  private readonly agents = new Map<string, ExecutableAgent>();
  /** name -> 运行时负载 */
  private readonly loads = new Map<string, AgentLoad>();

  /**
   * 注册一个 Agent
   *
   * @param agent - 待注册的可执行 Agent
   * @throws 当同名 Agent 已存在时抛出错误
   */
  register(agent: ExecutableAgent): void {
    const { name } = agent.metadata;
    if (this.agents.has(name)) {
      throw new Error(`Agent 已存在，重复注册: ${name}`);
    }
    this.agents.set(name, agent);
    this.loads.set(name, {
      name,
      activeTasks: 0,
      queuedTasks: 0,
      lastDurationMs: null,
      recentFailures: 0,
    });
  }

  /**
   * 注销一个 Agent
   *
   * @param name - Agent 名称
   * @returns 是否成功注销（不存在则返回 false）
   */
  unregister(name: string): boolean {
    this.loads.delete(name);
    return this.agents.delete(name);
  }

  /**
   * 按名称获取 Agent
   *
   * @param name - Agent 名称
   */
  get(name: string): ExecutableAgent | undefined {
    return this.agents.get(name);
  }

  /**
   * 判断 Agent 是否存在
   */
  has(name: string): boolean {
    return this.agents.has(name);
  }

  /**
   * 列出全部已注册 Agent
   */
  list(): readonly ExecutableAgent[] {
    return [...this.agents.values()];
  }

  /**
   * 按能力标签查询 Agent（取并集）
   *
   * @param capabilities - 所需能力标签集合
   * @returns 具备至少一项所需能力的 Agent 列表，按优先级降序
   */
  findByCapability(...capabilities: readonly CapabilityTag[]): ExecutableAgent[] {
    const set = new Set(capabilities);
    return [...this.agents.values()]
      .filter((a) => a.metadata.healthy)
      .filter((a) => a.metadata.capabilities.some((c) => set.has(c)))
      .sort((a, b) => b.metadata.priority - a.metadata.priority);
  }

  /**
   * 按层级查询 Agent
   *
   * @param layer - 智能体层级
   */
  findByLayer(layer: AgentLayer): ExecutableAgent[] {
    return [...this.agents.values()]
      .filter((a) => a.metadata.layer === layer)
      .sort((a, b) => b.metadata.priority - a.metadata.priority);
  }

  /**
   * 获取 Agent 当前负载快照
   *
   * @param name - Agent 名称
   */
  getLoad(name: string): AgentLoad | undefined {
    return this.loads.get(name);
  }

  /**
   * 获取全部 Agent 负载快照
   */
  getAllLoads(): readonly AgentLoad[] {
    return [...this.loads.values()];
  }

  /**
   * 占用一个任务槽位（任务开始时调用）
   *
   * @param name - Agent 名称
   * @throws 当 Agent 不存在或超出最大并发时抛出错误
   */
  acquire(name: string): void {
    const agent = this.agents.get(name);
    const load = this.loads.get(name);
    if (!agent || !load) {
      throw new Error(`Agent 未注册，无法 acquire: ${name}`);
    }
    if (load.activeTasks >= agent.metadata.maxConcurrency) {
      this.loads.set(name, { ...load, queuedTasks: load.queuedTasks + 1 });
      throw new Error(
        `Agent 并发已满: ${name} (active=${load.activeTasks}/${agent.metadata.maxConcurrency})`,
      );
    }
    this.loads.set(name, { ...load, activeTasks: load.activeTasks + 1 });
  }

  /**
   * 释放任务槽位（任务结束时调用，无论成功失败）
   *
   * @param name - Agent 名称
   * @param durationMs - 本次执行耗时
   * @param success - 是否成功（失败时累计 recentFailures）
   */
  release(name: string, durationMs: number, success: boolean): void {
    const load = this.loads.get(name);
    if (!load) return;
    const queuedDelta = load.queuedTasks > 0 ? 1 : 0;
    this.loads.set(name, {
      name,
      activeTasks: Math.max(0, load.activeTasks - 1),
      queuedTasks: load.queuedTasks - queuedDelta,
      lastDurationMs: durationMs,
      recentFailures: success ? 0 : load.recentFailures + 1,
    });
  }

  /**
   * 从候选 Agent 中按负载均衡策略挑选最优实例
   *
   * 策略：优先健康且未达并发上限者；同条件下按 activeTasks 升序、
   * recentFailures 升序、metadata.priority 降序。
   *
   * @param candidates - 候选 Agent 名称列表
   * @returns 最优 Agent，无可调度实例时返回 undefined
   */
  pickLeastLoaded(candidates: readonly string[]): ExecutableAgent | undefined {
    const feasible = candidates
      .map((name) => this.agents.get(name))
      .filter((a): a is ExecutableAgent => !!a && a.metadata.healthy)
      .filter((a) => {
        const load = this.loads.get(a.metadata.name);
        return load ? load.activeTasks < a.metadata.maxConcurrency : true;
      });

    if (feasible.length === 0) return undefined;

    feasible.sort((a, b) => {
      const la = this.loads.get(a.metadata.name)!;
      const lb = this.loads.get(b.metadata.name)!;
      if (la.activeTasks !== lb.activeTasks) {
        return la.activeTasks - lb.activeTasks;
      }
      if (la.recentFailures !== lb.recentFailures) {
        return la.recentFailures - lb.recentFailures;
      }
      return b.metadata.priority - a.metadata.priority;
    });

    return feasible[0];
  }

  /** 已注册 Agent 数量 */
  get size(): number {
    return this.agents.size;
  }
}
