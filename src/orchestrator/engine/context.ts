/**
 * 健澜科技杠OS - 工作流运行时上下文
 *
 * WorkflowContext 在一次工作流执行期间持有：
 *   - 工作流入参 input
 *   - 全局变量 vars（含定义的默认值，以及循环/人工节点写入的临时变量）
 *   - 每个节点的输出 records（供 ${nodes.xxx.output.yyy} 引用）
 *   - 患者/就诊上下文 patient（医疗安全与审计需要）
 *   - 触发元信息 trigger
 *
 * 它向安全表达式引擎提供统一的变量根对象，并负责数据映射（dataMapping/inputMapping）。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { evaluateExpression, renderTemplate, type ExpressionContext } from './expression.js';

/** 节点执行产出记录 */
export interface NodeRecord {
  /** 节点 ID */
  nodeId: string;
  /** 节点状态 */
  state: string;
  /** 节点输出（结构化数据） */
  output?: unknown;
  /** 开始时间 */
  startedAt?: number;
  /** 结束时间 */
  finishedAt?: number;
  /** 耗时毫秒 */
  durationMs?: number;
  /** 重试次数 */
  attempts?: number;
  /** 错误信息 */
  error?: string;
  /** token 消耗（LLM 节点） */
  tokens?: { input: number; output: number };
}

/** 触发来源信息 */
export interface TriggerInfo {
  type: 'manual' | 'api' | 'event' | 'schedule' | 'subagent';
  /** 事件名 / 定时表达式等 */
  source?: string;
  /** 触发用户 ID */
  userId?: string;
  /** 追踪 ID */
  traceId: string;
}

/** 工作流上下文初始化参数 */
export interface WorkflowContextInit {
  /** 工作流入参 */
  input?: Record<string, unknown>;
  /** 工作流定义的变量默认值 */
  variables?: Record<string, unknown>;
  /** 患者上下文（透传给医疗工具） */
  patient?: Record<string, unknown>;
  /** 当前用户/权限上下文（透传给医疗工具） */
  user?: Record<string, unknown>;
  /** 触发信息 */
  trigger: TriggerInfo;
  /** 工作流实例 ID */
  instanceId: string;
}

/**
 * 工作流运行时上下文
 */
export class WorkflowContext {
  /** 工作流入参（表达式根对象 input） */
  readonly input: Record<string, unknown>;
  /** 全局变量（表达式根对象 vars） */
  private readonly vars: Record<string, unknown>;
  /** 患者上下文（表达式根对象 patient） */
  readonly patient: Record<string, unknown>;
  /** 用户上下文（表达式根对象 user） */
  readonly user: Record<string, unknown>;
  /** 触发信息 */
  readonly trigger: TriggerInfo;
  /** 实例 ID */
  readonly instanceId: string;
  /** 节点产出记录 */
  private readonly records = new Map<string, NodeRecord>();
  /** 循环/分支产生的局部作用域（栈），foreach 当前元素等 */
  private readonly scopeStack: Record<string, unknown>[] = [];

  constructor(init: WorkflowContextInit) {
    this.input = init.input ?? {};
    this.vars = { ...(init.variables ?? {}) };
    this.patient = init.patient ?? {};
    this.user = init.user ?? {};
    this.trigger = init.trigger;
    this.instanceId = init.instanceId;
  }

  // --------------------------------------------------------------------------
  // 节点记录
  // --------------------------------------------------------------------------

  /** 标记节点开始 */
  markNodeStarted(nodeId: string): void {
    this.records.set(nodeId, {
      nodeId,
      state: 'running',
      startedAt: Date.now(),
      attempts: (this.records.get(nodeId)?.attempts ?? 0) + 1,
    });
  }

  /** 标记节点成功完成 */
  markNodeCompleted(nodeId: string, output: unknown, tokens?: NodeRecord['tokens']): void {
    const rec = this.records.get(nodeId);
    const startedAt = rec?.startedAt ?? Date.now();
    this.records.set(nodeId, {
      nodeId,
      state: 'completed',
      output,
      startedAt,
      finishedAt: Date.now(),
      durationMs: Date.now() - startedAt,
      attempts: rec?.attempts ?? 1,
      tokens,
    });
  }

  /** 标记节点失败 */
  markNodeFailed(nodeId: string, error: string): void {
    const rec = this.records.get(nodeId);
    const startedAt = rec?.startedAt ?? Date.now();
    this.records.set(nodeId, {
      nodeId,
      state: 'failed',
      output: rec?.output,
      startedAt,
      finishedAt: Date.now(),
      durationMs: Date.now() - startedAt,
      attempts: rec?.attempts ?? 1,
      error,
    });
  }

  /** 标记节点进入其他状态（等待人工/跳过/取消） */
  markNodeState(nodeId: string, state: string): void {
    const rec = this.records.get(nodeId) ?? { nodeId, state, startedAt: Date.now() };
    rec.state = state;
    this.records.set(nodeId, rec);
  }

  /** 获取节点记录 */
  getRecord(nodeId: string): NodeRecord | undefined {
    return this.records.get(nodeId);
  }

  /** 获取节点输出 */
  getNodeOutput(nodeId: string): unknown {
    return this.records.get(nodeId)?.output;
  }

  /** 获取全部记录（用于执行轨迹/回放） */
  getAllRecords(): NodeRecord[] {
    return Array.from(this.records.values());
  }

  // --------------------------------------------------------------------------
  // 变量与作用域
  // --------------------------------------------------------------------------

  /** 设置全局变量 */
  setVariable(name: string, value: unknown): void {
    this.vars[name] = value;
  }

  /** 推入局部作用域（foreach 当前元素等） */
  pushScope(scope: Record<string, unknown>): void {
    this.scopeStack.push(scope);
  }

  /** 弹出局部作用域 */
  popScope(): void {
    this.scopeStack.pop();
  }

  // --------------------------------------------------------------------------
  // 表达式上下文
  // --------------------------------------------------------------------------

  /**
   * 构建表达式求值根对象：
   *   input  - 工作流入参
   *   vars   - 全局变量
   *   nodes  - 各节点输出（nodes.<id>.output）
   *   patient- 患者上下文
   *   user   - 当前用户
   *   trigger- 触发信息
   *   以及局部作用域中的变量（foreach 的 item/index 等，优先级最高）
   */
  buildExpressionContext(): ExpressionContext {
    const nodes: Record<string, unknown> = {};
    for (const [id, rec] of this.records.entries()) {
      nodes[id] = { output: rec.output, state: rec.state, error: rec.error };
    }
    // 局部作用域合并（栈顶优先）
    const locals: Record<string, unknown> = {};
    for (const scope of this.scopeStack) {
      Object.assign(locals, scope);
    }
    return {
      input: this.input,
      vars: this.vars,
      nodes,
      patient: this.patient,
      user: this.user,
      trigger: this.trigger,
      ...locals,
    };
  }

  /** 求值表达式 */
  evaluate(expr: string): unknown {
    return evaluateExpression(expr, this.buildExpressionContext());
  }

  /** 求值布尔条件 */
  evaluateBool(expr: string): boolean {
    return Boolean(this.evaluate(expr));
  }

  /** 渲染字符串模板 */
  render(template: string): string {
    return renderTemplate(template, this.buildExpressionContext());
  }

  /**
   * 应用数据映射：将 { 目标字段: 表达式 } 映射为一个对象
   * 用于工具节点 inputMapping、code 节点 assignments、边 dataMapping
   */
  applyMapping(mapping: Record<string, string>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, expr] of Object.entries(mapping)) {
      // 常量字符串若不含表达式语法，直接作为字面量由表达式引擎按字符串处理
      result[key] = this.evaluate(expr);
    }
    return result;
  }

  /**
   * 将一个外部对象的字段（如人工表单结果）写入全局变量
   */
  mergeVariables(data: Record<string, unknown>): void {
    Object.assign(this.vars, data);
  }

  /** 导出可序列化快照（用于暂停/人工挂起时持久化） */
  snapshot(): Record<string, unknown> {
    return {
      input: this.input,
      vars: this.vars,
      patient: this.patient,
      user: this.user,
      trigger: this.trigger,
      instanceId: this.instanceId,
      records: this.getAllRecords(),
    };
  }
}
