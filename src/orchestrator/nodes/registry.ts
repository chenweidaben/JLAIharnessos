/**
 * 健澜科技杠OS - 节点执行器注册中心
 *
 * 汇总内置 12 类节点执行器，并支持注册自定义节点类型（低代码平台扩展点）。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { WorkflowNodeType } from '../dsl/types.js';
import type { NodeExecutor } from './types.js';
import {
  CodeNodeExecutor,
  ConditionNodeExecutor,
  DelayNodeExecutor,
  EndNodeExecutor,
  StartNodeExecutor,
} from './basicExecutors.js';
import {
  HumanNodeExecutor,
  LlmNodeExecutor,
  RagNodeExecutor,
  SubagentNodeExecutor,
  ToolNodeExecutor,
} from './serviceExecutors.js';
import { LoopNodeExecutor, ParallelNodeExecutor } from './controlExecutors.js';

/**
 * 节点执行器注册中心
 */
export class NodeExecutorRegistry {
  private readonly executors = new Map<WorkflowNodeType, NodeExecutor>();

  constructor() {
    this.registerDefaults();
  }

  /** 注册全部内置节点执行器 */
  private registerDefaults(): void {
    this.register(new StartNodeExecutor());
    this.register(new EndNodeExecutor());
    this.register(new LlmNodeExecutor());
    this.register(new ToolNodeExecutor());
    this.register(new ConditionNodeExecutor());
    this.register(new LoopNodeExecutor());
    this.register(new ParallelNodeExecutor());
    this.register(new HumanNodeExecutor());
    this.register(new SubagentNodeExecutor());
    this.register(new RagNodeExecutor());
    this.register(new CodeNodeExecutor());
    this.register(new DelayNodeExecutor());
  }

  /** 注册（或覆盖）节点执行器 */
  register(executor: NodeExecutor): void {
    this.executors.set(executor.type, executor);
  }

  /** 获取执行器 */
  get(type: WorkflowNodeType): NodeExecutor | undefined {
    return this.executors.get(type);
  }

  /** 是否支持某节点类型 */
  has(type: WorkflowNodeType): boolean {
    return this.executors.has(type);
  }

  /** 已注册的节点类型数量 */
  get size(): number {
    return this.executors.size;
  }
}

/** 单例：默认节点执行器注册中心 */
let defaultRegistry: NodeExecutorRegistry | null = null;

export function getDefaultNodeExecutorRegistry(): NodeExecutorRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new NodeExecutorRegistry();
  }
  return defaultRegistry;
}
