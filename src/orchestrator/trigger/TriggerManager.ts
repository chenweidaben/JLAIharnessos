/**
 * 健澜科技杠OS - 触发器管理器
 *
 * 支持智能体的四类触发方式：
 *   - manual：由用户/画布显式启动；
 *   - api：经 BFF HTTP 接口调用；
 *   - event：订阅业务事件（如 critical_value.emitted 危急值推送），事件到达即触发；
 *   - schedule：标准 5 段 cron 定时触发（如每日病历质控巡检）。
 *
 * 定时触发内置轻量 cron 匹配器（分 时 日 月 周，支持 * , - /），每分钟检查一次。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import type { AgentDefinition, TriggerDeclaration } from '../dsl/types.js';

/** 触发执行函数：由宿主绑定到 AgentInvoker/BFF */
export type TriggerRunner = (
  agent: AgentDefinition,
  input: Record<string, unknown>,
  trigger: { type: 'manual' | 'api' | 'event' | 'schedule'; source?: string },
) => Promise<unknown>;

interface RegisteredTrigger {
  agent: AgentDefinition;
  declaration: TriggerDeclaration;
}

/**
 * 计算某 cron 字段是否匹配当前值
 * 支持：*、具体值、列表(,)、范围(-)、步进(/)
 */
export function cronFieldMatches(field: string, value: number, min: number, max: number): boolean {
  if (field === '*') return true;
  return field.split(',').some((part) => {
    let [range, stepStr] = part.split('/');
    const step = stepStr ? parseInt(stepStr, 10) : 1;
    let lo: number;
    let hi: number;
    if (range === '*') {
      lo = min;
      hi = max;
    } else if (range.includes('-')) {
      [lo, hi] = range.split('-').map(Number);
    } else {
      lo = Number(range);
      hi = stepStr ? max : lo;
    }
    if (Number.isNaN(lo) || Number.isNaN(hi) || Number.isNaN(step)) return false;
    return value >= lo && value <= hi && (value - lo) % step === 0;
  });
}

/** 判断 5 段 cron 表达式在指定时间是否命中 */
export function cronMatches(expr: string, date: Date): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [minute, hour, dom, month, dow] = parts;
  const min = date.getMinutes();
  const hr = date.getHours();
  const dayOfMonth = date.getDate();
  const mon = date.getMonth() + 1;
  const dayOfWeek = date.getDay(); // 0=周日
  return (
    cronFieldMatches(minute, min, 0, 59) &&
    cronFieldMatches(hour, hr, 0, 23) &&
    cronFieldMatches(dom, dayOfMonth, 1, 31) &&
    cronFieldMatches(month, mon, 1, 12) &&
    cronFieldMatches(dow, dayOfWeek, 0, 6)
  );
}

/**
 * 触发器管理器
 */
export class TriggerManager {
  private readonly triggers: RegisteredTrigger[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastCronMinute = -1;

  constructor(private readonly runner: TriggerRunner) {}

  /** 注册智能体声明的全部触发器 */
  registerAgentTriggers(agent: AgentDefinition): void {
    for (const declaration of agent.triggers ?? []) {
      if (declaration.enabled === false) continue;
      this.triggers.push({ agent, declaration });
    }
  }

  /** 移除某智能体的全部触发器 */
  unregisterAgent(agentId: string): void {
    for (let i = this.triggers.length - 1; i >= 0; i--) {
      if (this.triggers[i].agent.id === agentId) this.triggers.splice(i, 1);
    }
  }

  /** 手动/API 触发 */
  async invoke(
    agent: AgentDefinition,
    input: Record<string, unknown>,
    type: 'manual' | 'api' = 'api',
  ): Promise<unknown> {
    return this.runner(agent, input, { type });
  }

  /**
   * 发射业务事件，触发所有匹配的 event 触发器
   * @returns 各匹配智能体的执行结果
   */
  async emit(eventName: string, payload: Record<string, unknown> = {}): Promise<unknown[]> {
    const matched = this.triggers.filter(
      (t) => t.declaration.type === 'event' && t.declaration.expression === eventName,
    );
    return Promise.all(
      matched.map((t) =>
        this.runner(t.agent, { eventName, payload }, { type: 'event', source: eventName }),
      ),
    );
  }

  /** 启动定时调度（每分钟检查） */
  start(now: Date = new Date()): void {
    if (this.timer) return;
    this.lastCronMinute = now.getHours() * 60 + now.getMinutes();
    this.timer = setInterval(() => this.tick(new Date()), 60_000);
    // 允许进程退出时不被定时器挂住
    if (typeof this.timer === 'object' && this.timer && 'unref' in this.timer) {
      (this.timer as { unref: () => void }).unref?.();
    }
  }

  /** 停止定时调度 */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** 单次定时检查（公开以便测试） */
  async tick(date: Date): Promise<void> {
    const minuteOfDay = date.getHours() * 60 + date.getMinutes();
    if (minuteOfDay === this.lastCronMinute) return; // 同一分钟不重复触发
    this.lastCronMinute = minuteOfDay;

    const scheduled = this.triggers.filter((t) => t.declaration.type === 'schedule');
    for (const t of scheduled) {
      const expr = t.declaration.expression;
      if (expr && cronMatches(expr, date)) {
        await this.runner(
          t.agent,
          { scheduledAt: date.toISOString() },
          { type: 'schedule', source: expr },
        ).catch(() => {
          /* 定时任务失败由运行结果/监控记录，避免中断后续任务 */
        });
      }
    }
  }

  /** 当前注册的触发器数量 */
  get size(): number {
    return this.triggers.length;
  }
}
