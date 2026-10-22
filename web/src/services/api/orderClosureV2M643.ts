/**
 * 健澜科技 jlmedaios - 医嘱闭环 v2 API（M643，配套 M570）
 *
 * 对接 BFF：GET /api/v1/orders
 *   （未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type OrderType = 'drug' | 'lab' | 'exam' | 'treatment' | 'nursing';
export type OrderStatus = 'draft' | 'pending' | 'reviewed' | 'executing' | 'stopped' | 'completed';

export interface OrderItem {
  id: string;
  patientId: string;
  orderNo: string;
  type: OrderType;
  content: string;
  dose?: string;
  frequency?: string;
  prescriber: string;
  reviewer?: string;
  status: OrderStatus;
  orderedAt: string;
}

export const ORDER_TYPE_META: Record<OrderType, { label: string; color: string }> = {
  drug: { label: '药品', color: 'blue' },
  lab: { label: '检验', color: 'cyan' },
  exam: { label: '检查', color: 'geekblue' },
  treatment: { label: '治疗', color: 'orange' },
  nursing: { label: '护理', color: 'purple' },
};

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  pending: { label: '待审核', color: 'orange' },
  reviewed: { label: '已审核', color: 'blue' },
  executing: { label: '执行中', color: 'processing' },
  stopped: { label: '已停止', color: 'red' },
  completed: { label: '已完成', color: 'green' },
};

const DEMO_ORDERS: OrderItem[] = [
  { id: 'O-001', patientId: 'P10001', orderNo: 'ORD-2601', type: 'drug', content: '阿莫西林胶囊', dose: '0.5g', frequency: 'tid', prescriber: '王医师', reviewer: '李主任', status: 'executing', orderedAt: '2026-10-22T08:00:00+08:00' },
  { id: 'O-002', patientId: 'P10001', orderNo: 'ORD-2602', type: 'lab', content: '血常规 + CRP', prescriber: '王医师', status: 'reviewed', orderedAt: '2026-10-22T08:10:00+08:00' },
  { id: 'O-003', patientId: 'P10001', orderNo: 'ORD-2603', type: 'treatment', content: '雾化吸入', dose: '2ml', frequency: 'bid', prescriber: '王医师', reviewer: '李主任', status: 'completed', orderedAt: '2026-10-20T09:00:00+08:00' },
  { id: 'O-004', patientId: 'P10001', orderNo: 'ORD-2604', type: 'exam', content: '胸部 CT', prescriber: '王医师', status: 'pending', orderedAt: '2026-10-22T09:30:00+08:00' },
];

export interface OrderListResult {
  items: OrderItem[];
  totalCount: number;
  demo: boolean;
}

export async function fetchOrders(patientId: string): Promise<OrderListResult> {
  try {
    const res = await get<{ items: OrderItem[]; totalCount: number }>('/orders', { patientId });
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_ORDERS.filter((o) => o.patientId === patientId), totalCount: 0, demo: true };
  }
}
