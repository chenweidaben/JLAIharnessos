/**
 * 健澜科技 jlmedaios - 出院随访管理 API（M901）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface FollowupWorkload {
  id: string;
  date: string;
  shouldFollowup: number;
  followedUp: number;
  phone: number;
  online: number;
  lost: number;
  status: string;
  typeBreakdown: { name: string; count: number }[];
  contentBreakdown: { name: string; count: number }[];
  lostReasons: string;
  followupRecords: string;
  satisfactionFeedback: string;
}

const DEMO: FollowupWorkload[] = [
  {
    id: 'FU-901',
    date: '2026-10-22',
    shouldFollowup: 150,
    followedUp: 138,
    phone: 90,
    online: 48,
    lost: 12,
    status: '正常运行',
    typeBreakdown: [
      { name: '出院 1 周随访', count: 80 },
      { name: '术后 1 月随访', count: 30 },
      { name: '慢病 3 月随访', count: 30 },
      { name: '肿瘤 6 月随访', count: 10 },
    ],
    contentBreakdown: [
      { name: '用药指导', count: 130 },
      { name: '康复指导', count: 100 },
      { name: '饮食指导', count: 80 },
      { name: '复诊提醒', count: 120 },
    ],
    lostReasons: '失访原因：电话无人接 6 例；号码错误 3 例；患者拒访 2 例；迁居 1 例。',
    followupRecords: '随访记录：今日完成 138 例；电话 90；线上（微信/APP）48；记录完整率 100%。',
    satisfactionFeedback: '满意度反馈：随访满意度 96%；患者投诉 0 例；建议改进 3 条（随访时段建议晚间）。',
  },
];

export interface FollowupWorkloadListResult {
  items: FollowupWorkload[];
  demo: boolean;
}

export async function fetchFollowupWorkload(): Promise<FollowupWorkloadListResult> {
  try {
    const res = await get<{ items: FollowupWorkload[] }>('/patient-service/followup/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
