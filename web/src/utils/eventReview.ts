/**
 * 健澜科技 jlmedaios - 不良事件后评估前端 utils（M17-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { EventType } from '@/types/eventReview';

const LABEL: Record<EventType, string> = {
  pressure_injury_stage2: '二期压力性损伤',
  pressure_injury_stage3: '三期压力性损伤',
  pressure_injury_stage4: '四期压力性损伤',
  fall: '跌倒事件',
};

export function eventTypeLabel(t: EventType): string {
  return LABEL[t] ?? t;
}

export function isFallEvent(t: EventType): boolean {
  return t === 'fall';
}

export function riskLevelLabel(l: string | null): string {
  if (l === 'high') return '高风险';
  if (l === 'medium') return '中风险';
  if (l === 'low') return '低风险';
  return '—';
}
