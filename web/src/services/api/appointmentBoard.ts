/**
 * 健澜科技 jlmedaios - 门诊预约管理看板 API（M503）
 * 对接 BFF /api/v1/appointment/* ：
 *   /appointment/schedule 出诊排班
 *   /appointment/records   预约记录
 *   /appointment/stats     预约统计
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface ScheduleRow {
  id: string;
  dept: string;
  doctor: string;
  title: 'chief' | 'associate' | 'attending';
  fee: number;
  remaining: number;
  demo?: boolean;
}

export interface RecordRow {
  id: string;
  patient: string;
  dept: string;
  doctor: string;
  time: string;
  source: 'wechat' | 'alipay' | 'kiosk' | 'window' | 'phone114';
  status: 'booked' | 'arrived' | 'cancelled' | 'noshow';
  demo?: boolean;
}

export interface ApptStats {
  totalToday: number;
  bookingRate: number; // %
  noshowRate: number; // %
  timeSlotRatio: number; // %
  demo?: boolean;
}

const DEMO_SCHEDULE: ScheduleRow[] = [
  { id: 'sc-1', dept: '心内科', doctor: '王**', title: 'chief', fee: 100, remaining: 8, demo: true },
  { id: 'sc-2', dept: '普外科', doctor: '李**', title: 'associate', fee: 50, remaining: 15, demo: true },
  { id: 'sc-3', dept: '神经内科', doctor: '赵**', title: 'attending', fee: 25, remaining: 20, demo: true },
  { id: 'sc-4', dept: '儿科', doctor: '陈**', title: 'associate', fee: 50, remaining: 12, demo: true },
];

const DEMO_RECORDS: RecordRow[] = [
  { id: 'rc-1', patient: '张**', dept: '心内科', doctor: '王**', time: '2026-10-20 09:00', source: 'wechat', status: 'booked', demo: true },
  { id: 'rc-2', patient: '李**', dept: '普外科', doctor: '李**', time: '2026-10-20 10:30', source: 'alipay', status: 'arrived', demo: true },
  { id: 'rc-3', patient: '王**', dept: '儿科', doctor: '陈**', time: '2026-10-20 11:00', source: 'kiosk', status: 'cancelled', demo: true },
  { id: 'rc-4', patient: '赵**', dept: '神经内科', doctor: '赵**', time: '2026-10-20 14:00', source: 'window', status: 'noshow', demo: true },
  { id: 'rc-5', patient: '钱**', dept: '心内科', doctor: '王**', time: '2026-10-20 15:30', source: 'phone114', status: 'booked', demo: true },
];

const DEMO_STATS: ApptStats = {
  totalToday: 3286,
  bookingRate: 82.5,
  noshowRate: 4.8,
  timeSlotRatio: 76.2,
  demo: true,
};

async function safeGet<T>(url: string, fallback: T[]): Promise<{ data: T[]; demo: boolean }> {
  try {
    const res = await get<{ items?: T[] } | T[]>(url);
    const items = Array.isArray(res) ? (res as T[]) : ((res as { items?: T[] })?.items ?? []);
    if (items.length > 0) return { data: items, demo: false };
    return { data: fallback, demo: true };
  } catch {
    return { data: fallback, demo: true };
  }
}

async function safeGetSingle<T>(url: string, fallback: T): Promise<{ data: T; demo: boolean }> {
  try {
    const res = await get<T & { demo?: boolean }>(url);
    if (res && typeof res === 'object') return { data: res, demo: false };
    return { data: fallback, demo: true };
  } catch {
    return { data: fallback, demo: true };
  }
}

export const fetchSchedule = () => safeGet<ScheduleRow>('/appointment/schedule', DEMO_SCHEDULE);
export const fetchRecords = () => safeGet<RecordRow>('/appointment/records', DEMO_RECORDS);
export const fetchStats = () => safeGetSingle<ApptStats>('/appointment/stats', DEMO_STATS);
