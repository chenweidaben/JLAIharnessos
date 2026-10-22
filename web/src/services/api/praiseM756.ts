/**
 * 健澜科技 jlmedaios - 表扬管理 API（M756）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type PraiseStatus = 'received' | 'verified' | 'rewarded';

export interface Praise {
  id: string;
  praiseNo: string;
  from: string;
  to: string;
  method: string;
  praisedAt: string;
  status: PraiseStatus;
  content: string;
  verification: string;
  reward: string;
}

export const PRAISE_STATUS_META: Record<PraiseStatus, { label: string; color: string }> = {
  received: { label: '已收到', color: 'blue' },
  verified: { label: '已核实', color: 'orange' },
  rewarded: { label: '已表彰', color: 'green' },
};

const DEMO: Praise[] = [
  {
    id: 'PR-001',
    praiseNo: 'PR-261001',
    from: '李患者',
    to: '普外科 王护士长',
    method: '锦旗 + 感谢信',
    praisedAt: '2026-10-19',
    status: 'rewarded',
    content: '表扬王护士长在术后护理中耐心细致、专业负责。',
    verification: '经护理部核实，情况属实。',
    reward: '季度服务明星，全院通报表扬。',
  },
];

export interface PraiseListResult {
  items: Praise[];
  demo: boolean;
}

export async function fetchPraisals(): Promise<PraiseListResult> {
  try {
    const res = await get<{ items: Praise[] }>('/patient-service/praisals');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
