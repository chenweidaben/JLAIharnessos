/**
 * 健澜科技 jlmedaios - 患者统一时间线（M470 P0 合规）
 *
 * 对接 BFF /api/v1/timeline/* 跨域事件聚合（门诊就诊/住院/检验/检查/用药/手术/护理）。
 * 契约字段：eventType / eventTime / title / detail / dept。
 * BFF 未就绪或 404 时，返回确定性 DEMO 兜底数据并标记 demo=true，页面可直接渲染。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export type TimelineEventType =
  | 'visit'
  | 'admission'
  | 'lab'
  | 'exam'
  | 'medication'
  | 'surgery'
  | 'nursing';

export interface TimelineEvent {
  id: string;
  eventType: TimelineEventType;
  eventTime: string;
  title: string;
  detail?: string;
  dept?: string;
  demo?: boolean;
}

const DEMO_EVENTS: TimelineEvent[] = [
  {
    id: 'demo-1',
    eventType: 'nursing',
    eventTime: '2026-10-20 08:30',
    title: '晨间护理查房',
    detail: '生命体征平稳，切口敷料干燥，二级护理',
    dept: '心内科一病区',
    demo: true,
  },
  {
    id: 'demo-2',
    eventType: 'medication',
    eventTime: '2026-10-20 08:00',
    title: '给药：阿司匹林肠溶片 100mg po qd',
    detail: '责任护士 林** 执行，双人核对无误',
    dept: '心内科一病区',
    demo: true,
  },
  {
    id: 'demo-3',
    eventType: 'lab',
    eventTime: '2026-10-19 16:20',
    title: '检验：血常规 + 生化',
    detail: 'HbA1c 6.6%（达标），WBC 7.2×10^9/L',
    dept: '检验科',
    demo: true,
  },
  {
    id: 'demo-4',
    eventType: 'exam',
    eventTime: '2026-10-19 10:00',
    title: '检查：心脏彩超',
    detail: 'LVEF 58%，左室舒张功能减退',
    dept: '超声科',
    demo: true,
  },
  {
    id: 'demo-5',
    eventType: 'surgery',
    eventTime: '2026-10-18 09:30',
    title: '手术：PCI 经皮冠脉介入',
    detail: '前降支植入支架 1 枚，术中顺利',
    dept: '心导管室',
    demo: true,
  },
  {
    id: 'demo-6',
    eventType: 'admission',
    eventTime: '2026-10-17 14:00',
    title: '入院：心内科一病区',
    detail: '主诊断：冠心病（不稳定型心绞痛）',
    dept: '心内科一病区',
    demo: true,
  },
  {
    id: 'demo-7',
    eventType: 'visit',
    eventTime: '2026-10-10 09:15',
    title: '门诊就诊：心内科专家门诊',
    detail: '医生：王** 主任医师；心电图 ST-T 改变',
    dept: '心内科门诊',
    demo: true,
  },
  {
    id: 'demo-8',
    eventType: 'visit',
    eventTime: '2026-09-20 11:00',
    title: '既往门诊：社区卫生服务中心',
    detail: '随访血压记录，建议上级医院进一步诊治',
    dept: '全科医学科',
    demo: true,
  },
];

/**
 * 拉取患者统一时间线。BFF /timeline/events 未就绪时降级为 DEMO 数据（不抛错）。
 */
export async function fetchTimelineEvents(patientId: string): Promise<TimelineEvent[]> {
  try {
    const res = await get<{ items?: TimelineEvent[] } | TimelineEvent[]>(
      '/timeline/events',
      { patientId },
    );
    const items = Array.isArray(res)
      ? res
      : (res?.items ?? []);
    if (items.length > 0) return items;
    return DEMO_EVENTS;
  } catch {
    return DEMO_EVENTS;
  }
}
