/**
 * 健澜科技 jlmedaios - 安全与隐私合规看板 API（M478）
 * 对接 BFF：
 *   - /security/privacy-classification  数据隐私分级
 *   - /security/audit-anomaly          审计异常行为
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface PrivacyRow {
  id: string;
  domain: string; // 业务域
  dataClass: string; // 表/字段集
  level: 'public' | 'internal' | 'sensitive' | 'core';
  count: number; // 条数
  encryption: boolean;
  maskField: boolean;
  owner: string;
  demo?: boolean;
}

export interface AnomalyRow {
  id: string;
  type: 'abnormal-login' | 'unauthorized-access' | 'bulk-export';
  actor: string;
  sourceIp: string;
  target: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  happenedAt: string;
  status: 'open' | 'acknowledged' | 'closed';
  detail?: string;
  demo?: boolean;
}

const DEMO_PRIVACY: PrivacyRow[] = [
  { id: 'pv-1', domain: '患者主索引', dataClass: '患者姓名/身份证/手机号', level: 'core', count: 128000, encryption: true, maskField: true, owner: '信息科-王**', demo: true },
  { id: 'pv-2', domain: '住院病历', dataClass: 'EMR 文书/诊断', level: 'sensitive', count: 86000, encryption: true, maskField: false, owner: '信息科-王**', demo: true },
  { id: 'pv-3', domain: '检验报告', dataClass: 'LIS 结果', level: 'sensitive', count: 210000, encryption: true, maskField: false, owner: '检验科-赵**', demo: true },
  { id: 'pv-4', domain: '医嘱费用', dataClass: '收费明细/医保结算', level: 'internal', count: 320000, encryption: false, maskField: false, owner: '财务科-李**', demo: true },
  { id: 'pv-5', domain: '科室字典', dataClass: '基础字典表', level: 'public', count: 1200, encryption: false, maskField: false, owner: '信息科-周**', demo: true },
];

const DEMO_ANOMALY: AnomalyRow[] = [
  { id: 'an-1', type: 'abnormal-login', actor: '张**(医生)', sourceIp: '203.0.113.25', target: 'HIS 门诊工作站', severity: 'high', happenedAt: '2026-10-20 03:42', status: 'open', detail: '异地 IP 凌晨登录' },
  { id: 'an-2', type: 'bulk-export', actor: '李**(科研)', sourceIp: '10.8.0.15', target: '科研数据集', severity: 'critical', happenedAt: '2026-10-20 09:18', status: 'open', detail: '单次导出 5000 条患者记录' },
  { id: 'an-3', type: 'unauthorized-access', actor: '赵**(护士)', sourceIp: '10.8.0.22', target: '心内科住院病历', severity: 'medium', happenedAt: '2026-10-20 10:05', status: 'acknowledged', detail: '跨科室访问病历 3 次' },
  { id: 'an-4', type: 'abnormal-login', actor: '系统账号', sourceIp: '198.51.100.8', target: 'BFF 管理后台', severity: 'critical', happenedAt: '2026-10-20 06:30', status: 'closed', detail: '暴力破解已封禁' },
  { id: 'an-5', type: 'bulk-export', actor: '王**(医生)', sourceIp: '10.8.0.31', target: '门诊就诊记录', severity: 'low', happenedAt: '2026-10-19 16:40', status: 'closed', detail: '合法科研导出已审批' },
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

export const fetchPrivacyClassification = () =>
  safeGet<PrivacyRow>('/security/privacy-classification', DEMO_PRIVACY);
export const fetchAuditAnomaly = () =>
  safeGet<AnomalyRow>('/security/audit-anomaly', DEMO_ANOMALY);
