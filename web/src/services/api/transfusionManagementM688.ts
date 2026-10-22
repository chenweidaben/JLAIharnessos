/**
 * 健澜科技 jlmedaios - 输血管理 API（M688）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type TransfusionStatus = 'requested' | 'crossmatched' | 'transfusing' | 'completed' | 'reacted';

export interface TransfusionOrder {
  id: string;
  reqNo: string;
  patientId: string;
  bloodType: string;
  component: string;
  volumeMl: number;
  status: TransfusionStatus;
  crossmatchResult: string;
  startedAt: string | null;
  endedAt: string | null;
  reaction: string;
}

export const TRANSFUSION_STATUS_META: Record<TransfusionStatus, { label: string; color: string }> = {
  requested: { label: '已申请', color: 'orange' },
  crossmatched: { label: '已交叉配血', color: 'blue' },
  transfusing: { label: '输血中', color: 'processing' },
  completed: { label: '已完成', color: 'green' },
  reacted: { label: '输血反应', color: 'red' },
};

const DEMO: TransfusionOrder[] = [
  {
    id: 'TX-001',
    reqNo: 'TX-2610001',
    patientId: 'P10020',
    bloodType: 'A Rh+',
    component: '悬浮红细胞 2U',
    volumeMl: 400,
    status: 'completed',
    crossmatchResult: '相容',
    startedAt: '2026-10-22T08:00:00+08:00',
    endedAt: '2026-10-22T09:00:00+08:00',
    reaction: '无',
  },
  {
    id: 'TX-002',
    reqNo: 'TX-2610002',
    patientId: 'P10021',
    bloodType: 'O Rh-',
    component: '新鲜冰冻血浆 400ml',
    volumeMl: 400,
    status: 'transfusing',
    crossmatchResult: '相容',
    startedAt: '2026-10-22T10:30:00+08:00',
    endedAt: null,
    reaction: '',
  },
  {
    id: 'TX-003',
    reqNo: 'TX-2610003',
    patientId: 'P10022',
    bloodType: 'B Rh+',
    component: '单采血小板 1治疗量',
    volumeMl: 200,
    status: 'reacted',
    crossmatchResult: '相容',
    startedAt: '2026-10-22T09:00:00+08:00',
    endedAt: '2026-10-22T09:20:00+08:00',
    reaction: '轻度发热反应（38.5℃），已停止输血并对症处理。',
  },
];

export interface OrderListResult {
  items: TransfusionOrder[];
  demo: boolean;
}

export async function fetchTransfusionOrders(): Promise<OrderListResult> {
  try {
    const res = await get<{ items: TransfusionOrder[] }>('/transfusion/orders');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
