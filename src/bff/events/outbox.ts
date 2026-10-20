/**
 * 健澜科技 jlmedaios - 事件总线（Outbox 模式骨架）
 *
 * 用于业务事件发布与消费，支持事件溯源/异步处理。
 * DEMO_MODE 下用内存数组模拟队列。
 *
 * 事件类型：
 * - order.created        医嘱创建
 * - lab.result           检验结果
 * - emergency.alert      急诊告警
 * - vitals.changed       体征变化
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

interface EventEnvelope {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
  consumed: boolean;
}

// 内存事件存储（DEMO_MODE 模拟）
const eventStore: EventEnvelope[] = [];

let eventCounter = 0;

/**
 * 发布事件
 * @param type 事件类型（order.created / lab.result / ...）
 * @param payload 事件载荷
 * @returns 事件 ID
 */
export function publishEvent(type: string, payload: Record<string, unknown>): string {
  eventCounter++;
  const event: EventEnvelope = {
    id: `EVT-${Date.now()}-${eventCounter}`,
    type,
    payload,
    createdAt: new Date().toISOString(),
    consumed: false,
  };
  eventStore.push(event);
  return event.id;
}

/**
 * 消费事件
 * @param type 可选，按类型过滤；不传则返回所有未消费事件
 * @returns 事件列表
 */
export function consumeEvents(type?: string): EventEnvelope[] {
  const events = type
    ? eventStore.filter((e) => e.type === type && !e.consumed)
    : eventStore.filter((e) => !e.consumed);

  // 标记为已消费
  events.forEach((e) => {
    e.consumed = true;
  });

  return events;
}

/**
 * 获取所有事件（不标记消费，用于查询/审计）
 */
export function getAllEvents(): EventEnvelope[] {
  return [...eventStore];
}

/**
 * 清空事件存储（仅 DEMO_MODE 用）
 */
export function clearEvents(): void {
  eventStore.length = 0;
  eventCounter = 0;
}
