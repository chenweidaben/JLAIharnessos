/**
 * 健澜科技 jlmedaios - 智慧服务三级运营看板 API（M479）
 * 对接 BFF /api/v1/smart-service/* ：
 *   - /smart-service/appointment   预约挂号
 *   - /smart-service/payment        诊间支付
 *   - /smart-service/report-query  报告查询
 *   - /smart-service/followup      随访
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface AppointmentRow {
  id: string;
  channel: string; // 公众号/小程序/自助机/窗口
  total: number;
  today: number;
  rate: number; // 预约率 %
  demo?: boolean;
}

export interface PaymentRow {
  id: string;
  dept: string;
  channel: string;
  count: number;
  amount: number;
  avgAmount: number;
  demo?: boolean;
}

export interface ReportQueryRow {
  id: string;
  type: string; // 检验/检查/影像
  total: number;
  queried: number;
  queryRate: number;
  avgQueryMinutes: number;
  demo?: boolean;
}

export interface FollowupRow {
  id: string;
  dept: string;
  should: number;
  done: number;
  rate: number;
  complaintCount: number;
  demo?: boolean;
}

const DEMO_APPOINTMENT: AppointmentRow[] = [
  { id: 'ap-1', channel: '小程序', total: 4860, today: 620, rate: 78.5, demo: true },
  { id: 'ap-2', channel: '公众号', total: 3220, today: 410, rate: 72.3, demo: true },
  { id: 'ap-3', channel: '自助机', total: 2180, today: 250, rate: 65.8, demo: true },
  { id: 'ap-4', channel: '窗口', total: 1560, today: 180, rate: 58.2, demo: true },
];

const DEMO_PAYMENT: PaymentRow[] = [
  { id: 'py-1', dept: '心内科', channel: '诊间支付', count: 4120, amount: 1865000, avgAmount: 452, demo: true },
  { id: 'py-2', dept: '检验科', channel: '线上缴费', count: 3860, amount: 723000, avgAmount: 187, demo: true },
  { id: 'py-3', dept: '放射科', channel: '线上缴费', count: 1650, amount: 988000, avgAmount: 599, demo: true },
  { id: 'py-4', dept: '药房', channel: '线上缴费', count: 5200, amount: 562000, avgAmount: 108, demo: true },
];

const DEMO_REPORT: ReportQueryRow[] = [
  { id: 'rq-1', type: '检验报告', total: 12800, queried: 11560, queryRate: 90.3, avgQueryMinutes: 12, demo: true },
  { id: 'rq-2', type: '检查报告', total: 4860, queried: 3980, queryRate: 81.9, avgQueryMinutes: 28, demo: true },
  { id: 'rq-3', type: '影像报告', total: 3120, queried: 2450, queryRate: 78.5, avgQueryMinutes: 35, demo: true },
];

const DEMO_FOLLOWUP: FollowupRow[] = [
  { id: 'fu-1', dept: '心内科', should: 860, done: 780, rate: 90.7, complaintCount: 1, demo: true },
  { id: 'fu-2', dept: '普外科', should: 640, done: 550, rate: 85.9, complaintCount: 0, demo: true },
  { id: 'fu-3', dept: '神经内科', should: 520, done: 440, rate: 84.6, complaintCount: 2, demo: true },
  { id: 'fu-4', dept: '内分泌科', should: 480, done: 400, rate: 83.3, complaintCount: 0, demo: true },
];

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

export const fetchAppointment = () =>
  safeGet<AppointmentRow>('/smart-service/appointment', DEMO_APPOINTMENT);
export const fetchPayment = () =>
  safeGet<PaymentRow>('/smart-service/payment', DEMO_PAYMENT);
export const fetchReportQuery = () =>
  safeGet<ReportQueryRow>('/smart-service/report-query', DEMO_REPORT);
export const fetchFollowup = () =>
  safeGet<FollowupRow>('/smart-service/followup', DEMO_FOLLOWUP);
