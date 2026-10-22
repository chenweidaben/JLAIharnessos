/**
 * 健澜科技 jlmedaios - 门诊大厅管理 API（M900）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface OutpatientHallWorkload {
  id: string;
  date: string;
  visits: number;
  registered: number;
  waiting: number;
  billed: number;
  dispensed: number;
  status: string;
  peakFlow: string;
  waitTime: string;
  billingWindows: string;
  pharmacyWindows: string;
  kioskUsage: string;
}

const DEMO: OutpatientHallWorkload[] = [
  {
    id: 'OH-900',
    date: '2026-10-22',
    visits: 4200,
    registered: 4100,
    waiting: 320,
    billed: 3800,
    dispensed: 3200,
    status: '正常运行',
    peakFlow: '门诊流量：早高峰 8:00-10:00 2200 人次（占 52%）；午高峰 11:00-13:00 1200 人次（29%）；晚高峰 14:00-16:00 800 人次（19%）。',
    waitTime: '候诊时长：平均候诊 22min；专家门诊 18min；普通门诊 25min；最长候诊 45min（内科某诊室）。',
    billingWindows: '收费窗口使用：开放 8 个窗口；窗口平均排队 6 人；自助机缴费占比 45%。',
    pharmacyWindows: '取药窗口使用：中西药窗口各 4 个；平均取药等待 8min；预配药覆盖率 80%。',
    kioskUsage: '自助机使用情况：自助机 12 台（挂号 4/缴费 4/打印 4）；今日自助机交易 1800 笔（占总交易 40%）；故障率 0。',
  },
];

export interface OutpatientHallWorkloadListResult {
  items: OutpatientHallWorkload[];
  demo: boolean;
}

export async function fetchOutpatientHallWorkload(): Promise<OutpatientHallWorkloadListResult> {
  try {
    const res = await get<{ items: OutpatientHallWorkload[] }>('/patient-service/hall/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
