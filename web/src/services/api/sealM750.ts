/**
 * 健澜科技 jlmedaios - 印章管理 API（M750）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type SealStatus = 'active' | 'sealed' | 'destroyed';

export interface Seal {
  id: string;
  name: string;
  type: string;
  keeper: string;
  activatedAt: string;
  status: SealStatus;
  usages: { date: string; purpose: string; approver: string }[];
  handovers: { date: string; from: string; to: string }[];
}

export const SEAL_STATUS_META: Record<SealStatus, { label: string; color: string }> = {
  active: { label: '使用中', color: 'green' },
  sealed: { label: '封存', color: 'orange' },
  destroyed: { label: '已销毁', color: 'red' },
};

const DEMO: Seal[] = [
  {
    id: 'SL-001',
    name: '杭州健澜科技有限公司公章',
    type: '行政公章',
    keeper: '王办公室',
    activatedAt: '2018-07-01',
    status: 'active',
    usages: [
      { date: '2026-10-15', purpose: '对外合同盖章', approver: '陈副院长' },
    ],
    handovers: [
      { date: '2022-01-01', from: '李办公室', to: '王办公室' },
    ],
  },
];

export interface SealListResult {
  items: Seal[];
  demo: boolean;
}

export async function fetchSeals(): Promise<SealListResult> {
  try {
    const res = await get<{ items: Seal[] }>('/admin/seals');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
