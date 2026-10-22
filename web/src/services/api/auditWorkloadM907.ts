/**
 * 健澜科技 jlmedaios - 审计管理 API（M907）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface AuditWorkload {
  id: string;
  date: string;
  internalAudits: number;
  externalAudits: number;
  issues: number;
  rectified: number;
  auditAmount: number;
  status: string;
  typeBreakdown: { name: string; count: number }[];
  findings: string;
  rectification: string;
  externalCoordination: string;
  reportManagement: string;
}

const DEMO: AuditWorkload[] = [
  {
    id: 'AUD-907',
    date: '2026-10-22',
    internalAudits: 2,
    externalAudits: 0,
    issues: 18,
    rectified: 14,
    auditAmount: 8600,
    status: '正常运行',
    typeBreakdown: [
      { name: '财务收支审计', count: 1 },
      { name: '经济责任审计', count: 0 },
      { name: '工程审计', count: 1 },
      { name: '专项审计', count: 0 },
    ],
    findings: '审计发现问题：本期发现问题 18 个（制度类 6/执行类 8/管理类 4）；涉及金额 8600 万；重大问题 0 个。',
    rectification: '整改落实情况：已完成整改 14 个（整改率 78%）；限期整改 4 个（含 2 个价格执行、2 个采购流程）。',
    externalCoordination: '外部审计配合：配合卫健委医保飞检 0 次；配合审计署专项调查 0 次；外部审计整改完成率 100%。',
    reportManagement: '审计报告管理：本期出具审计报告 2 份；底稿 36 份；档案归档率 100%；报告提交院长办公会 1 次。',
  },
];

export interface AuditWorkloadListResult {
  items: AuditWorkload[];
  demo: boolean;
}

export async function fetchAuditWorkload(): Promise<AuditWorkloadListResult> {
  try {
    const res = await get<{ items: AuditWorkload[] }>('/audit/management/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
