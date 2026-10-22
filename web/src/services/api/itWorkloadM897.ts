/**
 * 健澜科技 jlmedaios - 信息科管理 API（M897）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface ItWorkload {
  id: string;
  date: string;
  systemAvailability: number;
  tickets: number;
  supportVisits: number;
  securityIncidents: number;
  backups: number;
  status: string;
  systemBreakdown: { name: string; availability: number }[];
  ticketBreakdown: { name: string; count: number }[];
  security: string;
  backup: string;
  userSupport: string;
}

const DEMO: ItWorkload[] = [
  {
    id: 'IT-897',
    date: '2026-10-22',
    systemAvailability: 99.95,
    tickets: 28,
    supportVisits: 120,
    securityIncidents: 0,
    backups: 3,
    status: '正常运行',
    systemBreakdown: [
      { name: 'HIS', availability: 99.98 },
      { name: 'EMR', availability: 99.95 },
      { name: 'LIS', availability: 99.90 },
      { name: 'PACS', availability: 99.92 },
    ],
    ticketBreakdown: [
      { name: '硬件故障', count: 8 },
      { name: '软件问题', count: 12 },
      { name: '网络问题', count: 4 },
      { name: '权限申请', count: 4 },
    ],
    security: '网络安全：漏洞扫描 1 次（中危漏洞 2 个已修复）；等保三级测评年度复测通过；渗透测试 0 高危。',
    backup: '数据备份：全量备份每日 1 次（凌晨 1:00）；增量备份每 4 小时 1 次；备份成功率 100%；异地容灾同步正常。',
    userSupport: '用户支持：今日 IT 支持 120 人次；远程协助 80；现场服务 40；平均响应时间 5min。',
  },
];

export interface ItWorkloadListResult {
  items: ItWorkload[];
  demo: boolean;
}

export async function fetchItWorkload(): Promise<ItWorkloadListResult> {
  try {
    const res = await get<{ items: ItWorkload[] }>('/it/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
