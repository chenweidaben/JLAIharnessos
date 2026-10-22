/**
 * 健澜科技 jlmedaios - 单病种质量管理 API（M708）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface SingleDisease {
  id: string;
  name: string;
  caseCount: number;
  avgLosDays: number;
  avgCost: number;
  complianceRate: number;
  deviations: { inpatientNo: string; reason: string }[];
}

const DEMO: SingleDisease[] = [
  {
    id: 'SD-001',
    name: '急性 ST 段抬高型心肌梗死（STEMI）',
    caseCount: 42,
    avgLosDays: 7.5,
    avgCost: 38500,
    complianceRate: 92.9,
    deviations: [
      { inpatientNo: 'ZY-2501', reason: 'D-to-B 时间 >90min（105min）' },
      { inpatientNo: 'ZY-2588', reason: '未行早期β受体阻滞剂治疗' },
    ],
  },
  {
    id: 'SD-002',
    name: '社区获得性肺炎（CAP）',
    caseCount: 86,
    avgLosDays: 8.2,
    avgCost: 12800,
    complianceRate: 88.4,
    deviations: [
      { inpatientNo: 'ZY-2610', reason: '抗菌药物首剂时机 >4h' },
    ],
  },
];

export interface DiseaseListResult {
  items: SingleDisease[];
  demo: boolean;
}

export async function fetchSingleDiseases(): Promise<DiseaseListResult> {
  try {
    const res = await get<{ items: SingleDisease[] }>('/quality/single-diseases');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
