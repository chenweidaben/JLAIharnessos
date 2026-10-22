/**
 * 健澜科技 jlmedaios - 预约挂号管理 API（M899）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface AppointmentWorkload {
  id: string;
  date: string;
  total: number;
  expert: number;
  general: number;
  sameDay: number;
  noShow: number;
  status: string;
  channelBreakdown: { name: string; count: number }[];
  slotManagement: string;
  noShowAnalysis: string;
  refundRecords: string;
  expertSchedule: string;
}

const DEMO: AppointmentWorkload[] = [
  {
    id: 'APT-899',
    date: '2026-10-22',
    total: 3200,
    expert: 1200,
    general: 2000,
    sameDay: 480,
    noShow: 96,
    status: '正常运行',
    channelBreakdown: [
      { name: '微信公众号', count: 1400 },
      { name: 'APP', count: 900 },
      { name: '网站', count: 200 },
      { name: '电话', count: 300 },
      { name: '窗口', count: 400 },
    ],
    slotManagement: '号源管理：专家号源 7 天前开放；普通号源 1 天前开放；今日号源利用率 92%。',
    noShowAnalysis: '爽约分析：今日爽约 96 人（3%）；专家号爽约率 4.2%；普通号 2.4%；爽约后 30min 自动退号池。',
    refundRecords: '退号记录：今日退号 120 例（患者主动退号 90/医生停诊 30）；全额退费率 100%。',
    expertSchedule: '专家出诊安排：今日专家出诊 48 人次（正高 20/副高 28）；停诊 2 人次（已短信通知患者改约）。',
  },
];

export interface AppointmentWorkloadListResult {
  items: AppointmentWorkload[];
  demo: boolean;
}

export async function fetchAppointmentWorkload(): Promise<AppointmentWorkloadListResult> {
  try {
    const res = await get<{ items: AppointmentWorkload[] }>('/patient-service/appointment/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
