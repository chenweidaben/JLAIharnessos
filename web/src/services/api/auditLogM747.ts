/**
 * 健澜科技 jlmedaios - 日志审计 API（M747）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type AuditResult = 'success' | 'failure';

export interface AuditLog {
  id: string;
  operator: string;
  operatedAt: string;
  action: string;
  target: string;
  ip: string;
  result: AuditResult;
  content: string;
  request: string;
  response: string;
}

export const AUDIT_RESULT_META: Record<AuditResult, { label: string; color: string }> = {
  success: { label: '成功', color: 'green' },
  failure: { label: '失败', color: 'red' },
};

const DEMO: AuditLog[] = [
  {
    id: 'AL-001',
    operator: '陈维',
    operatedAt: '2026-10-22 09:15:30',
    action: '登录',
    target: '系统登录',
    ip: '10.20.30.40',
    result: 'success',
    content: '用户登录系统。',
    request: '{username: "chenwei"}',
    response: '{token: "***"}',
  },
];

export interface AuditListResult {
  items: AuditLog[];
  demo: boolean;
}

export async function fetchAuditLogs(): Promise<AuditListResult> {
  try {
    const res = await get<{ items: AuditLog[] }>('/system/audit-logs');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
