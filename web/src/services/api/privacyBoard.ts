/**
 * 健澜科技 jlmedaios - 患者隐私授权管理看板 API（M501）
 * 对接 BFF /api/v1/privacy/* ：
 *   /privacy/consent     授权记录
 *   /privacy/access-log  访问日志
 *   /privacy/violation  违规事件
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface ConsentRow {
  id: string;
  patient: string;
  type: 'treatment' | 'share' | 'research' | 'query';
  grantedAt: string;
  expiresAt: string;
  demo?: boolean;
}

export interface AccessLogRow {
  id: string;
  accessor: string;
  dept: string;
  dataType: string;
  accessedAt: string;
  purpose: string;
  demo?: boolean;
}

export interface ViolationRow {
  id: string;
  description: string;
  involved: string;
  discoveredAt: string;
  status: 'investigating' | 'processed' | 'closed';
  action: string;
  demo?: boolean;
}

const DEMO_CONSENT: ConsentRow[] = [
  { id: 'co-1', patient: '张**', type: 'treatment', grantedAt: '2026-10-15', expiresAt: '2026-10-22', demo: true },
  { id: 'co-2', patient: '李**', type: 'share', grantedAt: '2026-10-10', expiresAt: '2027-10-09', demo: true },
  { id: 'co-3', patient: '王**', type: 'research', grantedAt: '2026-09-20', expiresAt: '2027-09-19', demo: true },
  { id: 'co-4', patient: '赵**', type: 'query', grantedAt: '2026-10-18', expiresAt: '2026-10-18', demo: true },
];

const DEMO_ACCESS: AccessLogRow[] = [
  { id: 'al-1', accessor: '王医生', dept: '心内科', dataType: '住院病历', accessedAt: '2026-10-19 09:15', purpose: '诊疗需要', demo: true },
  { id: 'al-2', accessor: '李医生', dept: '影像科', dataType: '影像报告', accessedAt: '2026-10-19 10:30', purpose: '报告复核', demo: true },
  { id: 'al-3', accessor: '赵医生', dept: '医务处', dataType: '全量病历', accessedAt: '2026-10-19 14:00', purpose: '质控检查', demo: true },
  { id: 'al-4', accessor: '陈护士', dept: '普外科', dataType: '护理记录', accessedAt: '2026-10-19 15:20', purpose: '护理执行', demo: true },
];

const DEMO_VIOLATION: ViolationRow[] = [
  { id: 'vi-1', description: '非授权访问他科病历', involved: '某医生', discoveredAt: '2026-10-12', status: 'processed', action: '通报批评 + 权限回收', demo: true },
  { id: 'vi-2', description: '病历截屏外发', involved: '某技师', discoveredAt: '2026-10-15', status: 'investigating', action: '调查中', demo: true },
  { id: 'vi-3', description: '过期授权仍访问', involved: '某研究生', discoveredAt: '2026-10-08', status: 'closed', action: '权限关闭 + 培训', demo: true },
];

async function safeGet<T>(url: string, fallback: T[]): Promise<{ data: T[]; demo: boolean }> {
  try {
    const res = await get<{ items?: T[] } | T[]>(url);
    const items = Array.isArray(res) ? (res as T[]) : ((res as { items?: T[] })?.items ?? []);
    if (items.length > 0) return { data: items, demo: false };
    return { data: fallback, demo: true };
  } catch {
    return { data: fallback, demo: true };
  }
}

export const fetchConsent = () => safeGet<ConsentRow>('/privacy/consent', DEMO_CONSENT);
export const fetchAccessLog = () => safeGet<AccessLogRow>('/privacy/access-log', DEMO_ACCESS);
export const fetchViolation = () => safeGet<ViolationRow>('/privacy/violation', DEMO_VIOLATION);
