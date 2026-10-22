/**
 * 健澜科技 jlmedaios - DRG 分组看板 v2 API（M634，配套 M607）
 *
 * 对接 BFF：GET /api/v1/drg/cases + GET /api/v1/drg/groups
 *   （8 病例含 3 超支 + 2 结余 + 6 个 DRG 组目录）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type DrgPnl = 'over' | 'under' | 'balanced';

export interface DrgCase {
  caseId: string;
  patientId: string;
  deptName: string;
  drgCode: string;
  totalCost: number;
  weight: number;
  pnlStatus: DrgPnl;
  pnlAmount: number;
}

export interface DrgGroup {
  code: string;
  name: string;
  avgCost: number;
  avgWeight: number;
  caseCount: number;
}

export interface DrgBundle {
  cases: DrgCase[];
  groups: DrgGroup[];
}

export const DRG_PNL_META: Record<DrgPnl, { label: string; color: string }> = {
  over: { label: '超支', color: 'red' },
  under: { label: '结余', color: 'green' },
  balanced: { label: '持平', color: 'default' },
};

const DEMO_BUNDLE: DrgBundle = {
  cases: [
    { caseId: 'DC-001', patientId: 'P10001', deptName: '心内科', drgCode: 'FM29', totalCost: 32500, weight: 1.2, pnlStatus: 'over', pnlAmount: -4500 },
    { caseId: 'DC-002', patientId: 'P10002', deptName: '普外科', drgCode: 'GB25', totalCost: 18800, weight: 0.9, pnlStatus: 'under', pnlAmount: 2200 },
    { caseId: 'DC-003', patientId: 'P10003', deptName: '骨科', drgCode: 'IB29', totalCost: 45000, weight: 1.8, pnlStatus: 'over', pnlAmount: -8000 },
    { caseId: 'DC-004', patientId: 'P10004', deptName: '儿科', drgCode: 'ES15', totalCost: 6200, weight: 0.4, pnlStatus: 'balanced', pnlAmount: 0 },
    { caseId: 'DC-005', patientId: 'P10005', deptName: '呼吸科', drgCode: 'DR29', totalCost: 22000, weight: 1.0, pnlStatus: 'over', pnlAmount: -1500 },
    { caseId: 'DC-006', patientId: 'P10006', deptName: '神经内科', drgCode: 'BR25', totalCost: 19500, weight: 0.95, pnlStatus: 'under', pnlAmount: 1300 },
    { caseId: 'DC-007', patientId: 'P10007', deptName: '产科', drgCode: 'OB35', totalCost: 9800, weight: 0.5, pnlStatus: 'balanced', pnlAmount: 0 },
    { caseId: 'DC-008', patientId: 'P10008', deptName: '泌尿外科', drgCode: 'MS29', totalCost: 27000, weight: 1.1, pnlStatus: 'balanced', pnlAmount: 0 },
  ],
  groups: [
    { code: 'FM29', name: '心衰', avgCost: 30000, avgWeight: 1.2, caseCount: 12 },
    { code: 'GB25', name: '胆囊切除', avgCost: 21000, avgWeight: 0.9, caseCount: 18 },
    { code: 'IB29', name: '关节置换', avgCost: 52000, avgWeight: 1.9, caseCount: 8 },
    { code: 'ES15', name: '小儿肺炎', avgCost: 6500, avgWeight: 0.4, caseCount: 25 },
    { code: 'DR29', name: 'COPD 急性加重', avgCost: 23000, avgWeight: 1.0, caseCount: 10 },
    { code: 'BR25', name: '脑梗死', avgCost: 21000, avgWeight: 0.95, caseCount: 14 },
  ],
};

export async function fetchDrgBundle(): Promise<DrgBundle & { demo: boolean }> {
  try {
    const [casesRes, groupsRes] = await Promise.all([
      get<{ items: DrgCase[] }>('/drg/cases'),
      get<{ items: DrgGroup[] }>('/drg/groups'),
    ]);
    return { cases: casesRes.items, groups: groupsRes.items, demo: false };
  } catch {
    return { ...DEMO_BUNDLE, demo: true };
  }
}
