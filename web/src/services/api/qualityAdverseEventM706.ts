/**
 * 健澜科技 jlmedaios - 医疗不良事件上报 API（M706）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type EventLevel = 'incident' | 'near_miss' | 'adverse';
export type EventStatus = 'reported' | 'under_investigation' | 'closed';

export interface AdverseEvent {
  id: string;
  eventNo: string;
  eventType: string;
  level: EventLevel;
  occurredAt: string;
  status: EventStatus;
  description: string;
  rootCause: string;
  correctiveAction: string;
  followUp: string;
}

export const EVENT_LEVEL_META: Record<EventLevel, { label: string; color: string }> = {
  incident: { label: '隐患事件', color: 'blue' },
  near_miss: { label: '未遂事件', color: 'orange' },
  adverse: { label: '不良事件', color: 'red' },
};

export const EVENT_STATUS_META: Record<EventStatus, { label: string; color: string }> = {
  reported: { label: '已上报', color: 'orange' },
  under_investigation: { label: '调查中', color: 'processing' },
  closed: { label: '已闭环', color: 'green' },
};

const DEMO: AdverseEvent[] = [
  {
    id: 'AE-001',
    eventNo: 'AE-261001',
    eventType: '用药错误',
    level: 'adverse',
    occurredAt: '2026-10-18T10:00:00+08:00',
    status: 'under_investigation',
    description: '护士执行医嘱时将 5%GS 错配为 10%GS 静脉滴注 50ml 后发现，患者未诉不适。',
    rootCause: '药房标签手写模糊，双人核对未严格执行。',
    correctiveAction: '重打标签；强化三查七对；班组复盘培训。',
    followUp: '待一周后追踪复核依从率。',
  },
];

export interface EventListResult {
  items: AdverseEvent[];
  demo: boolean;
}

export async function fetchQualityAdverseEvents(): Promise<EventListResult> {
  try {
    const res = await get<{ items: AdverseEvent[] }>('/quality/adverse-events');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
