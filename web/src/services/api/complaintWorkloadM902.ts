/**
 * 健澜科技 jlmedaios - 投诉管理 API（M902）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface ComplaintWorkload {
  id: string;
  date: string;
  total: number;
  accepted: number;
  processing: number;
  closed: number;
  satisfaction: number;
  status: string;
  categoryBreakdown: { name: string; count: number }[];
  channelBreakdown: { name: string; count: number }[];
  processFlow: string;
  improvements: string;
  hotspotAnalysis: string;
}

const DEMO: ComplaintWorkload[] = [
  {
    id: 'CP-902',
    date: '2026-10-22',
    total: 6,
    accepted: 6,
    processing: 2,
    closed: 4,
    satisfaction: 95,
    status: '正常运行',
    categoryBreakdown: [
      { name: '服务态度', count: 2 },
      { name: '医疗技术', count: 1 },
      { name: '就医环境', count: 1 },
      { name: '医疗费用', count: 1 },
      { name: '等待时间', count: 1 },
    ],
    channelBreakdown: [
      { name: '电话（12345/院内）', count: 3 },
      { name: '意见箱', count: 1 },
      { name: '网络（点评/APP）', count: 1 },
      { name: '现场', count: 1 },
    ],
    processFlow: '处理流程：受理（24h 内）→ 调查（3 工作日）→ 反馈（5 工作日）→ 结案（7 工作日）；今日平均处理时长 4.2 天。',
    improvements: '改进措施：服务态度投诉 2 起已约谈当事医护并组织服务规范培训；环境投诉已安排保洁加密巡环。',
    hotspotAnalysis: '投诉热点分析：本月投诉集中在门诊候诊时间（32%）和收费透明度（25%）；已启动高峰时段弹性排班。',
  },
];

export interface ComplaintWorkloadListResult {
  items: ComplaintWorkload[];
  demo: boolean;
}

export async function fetchComplaintWorkload(): Promise<ComplaintWorkloadListResult> {
  try {
    const res = await get<{ items: ComplaintWorkload[] }>('/patient-service/complaint/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
