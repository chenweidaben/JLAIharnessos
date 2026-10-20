/**
 * 健澜科技 jlmedaios - 医保智能审核深度监控看板 API（M513）
 * 对接 BFF /api/v1/insurance/* ：
 *   /insurance/audit-rules       医保规则审核
 *   /insurance/denials            拒付分析
 *   /insurance/settlement-stats   结算统计
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface AuditRuleRow {
  id: string;
  name: string;
  category: 'indicationMismatch' | 'beyondLimit' | 'duplicateCharge' | 'overdose' | 'swapItem';
  severity: 'high' | 'medium' | 'low';
  hits: number;
  demo?: boolean;
}

export interface DenialRow {
  id: string;
  reason: 'incompleteDoc' | 'outCatalog' | 'overLimit' | 'repeatAdmit';
  period: string;
  amount: number; // 元
  demo?: boolean;
}

export interface SettlementStats {
  monthlyTotal: number; // 元
  drgGroupRate: number; // %
  denialRate: number; // %
  violationHits: number;
  demo?: boolean;
}

const DEMO_RULES: AuditRuleRow[] = [
  { id: 'r-1', name: '适应症不符', category: 'indicationMismatch', severity: 'medium', hits: 28, demo: true },
  { id: 'r-2', name: '超限定支付', category: 'beyondLimit', severity: 'high', hits: 15, demo: true },
  { id: 'r-3', name: '重复收费', category: 'duplicateCharge', severity: 'medium', hits: 42, demo: true },
  { id: 'r-4', name: '超量开药', category: 'overdose', severity: 'low', hits: 8, demo: true },
  { id: 'r-5', name: '串换项目', category: 'swapItem', severity: 'high', hits: 3, demo: true },
];

const DEMO_DENIALS: DenialRow[] = [
  { id: 'dn-1', reason: 'incompleteDoc', period: '2026-09', amount: 12600, demo: true },
  { id: 'dn-2', reason: 'outCatalog', period: '2026-09', amount: 8400, demo: true },
  { id: 'dn-3', reason: 'overLimit', period: '2026-09', amount: 23800, demo: true },
  { id: 'dn-4', reason: 'repeatAdmit', period: '2026-09', amount: 5600, demo: true },
];

const DEMO_STATS: SettlementStats = {
  monthlyTotal: 48_620_000,
  drgGroupRate: 78.5,
  denialRate: 0.92,
  violationHits: 96,
  demo: true,
};

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

async function safeGetSingle<T>(url: string, fallback: T): Promise<{ data: T; demo: boolean }> {
  try {
    const res = await get<T & { demo?: boolean }>(url);
    if (res && typeof res === 'object') return { data: res, demo: false };
    return { data: fallback, demo: true };
  } catch {
    return { data: fallback, demo: true };
  }
}

export const fetchAuditRules = () => safeGet<AuditRuleRow>('/insurance/audit-rules', DEMO_RULES);
export const fetchDenials = () => safeGet<DenialRow>('/insurance/denials', DEMO_DENIALS);
export const fetchSettlementStats = () => safeGetSingle<SettlementStats>('/insurance/settlement-stats', DEMO_STATS);
