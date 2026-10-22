/**
 * 健澜科技 jlmedaios - 临床路径 v2 API（M667，配套 M562）
 *
 * 对接 BFF：GET /api/v1/clinical-pathways
 *   （未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface ClinicalPathway {
  id: string;
  code: string;
  name: string;
  disease: string;
  avgLengthOfStay: number;
  enrolledCount: number;
  completedCount: number;
  deviationRatePct: number;
  steps: string[];
}

const DEMO_PATHWAYS: ClinicalPathway[] = [
  {
    id: 'CP-001',
    code: 'CP-COPD-01',
    name: '慢性阻塞性肺疾病急性加重临床路径',
    disease: '慢阻肺急性加重（J44.1）',
    avgLengthOfStay: 9,
    enrolledCount: 128,
    completedCount: 110,
    deviationRatePct: 14.1,
    steps: ['入院 24h 评估', '抗感染 + 支气管扩张', '肺功能评估', '健康教育', '出院随访'],
  },
  {
    id: 'CP-002',
    code: 'CP-STEMI-01',
    name: '急性 ST 段抬高型心梗临床路径',
    disease: 'STEMI（I21.0）',
    avgLengthOfStay: 7,
    enrolledCount: 86,
    completedCount: 78,
    deviationRatePct: 9.3,
    steps: ['急诊 PCI', '双联抗血小板', '心脏康复评估', '出院随访'],
  },
  {
    id: 'CP-003',
    code: 'CP-LAPCHOLE-01',
    name: '腹腔镜胆囊切除术临床路径',
    disease: '慢性胆囊炎伴胆囊结石（K80.1）',
    avgLengthOfStay: 5,
    enrolledCount: 210,
    completedCount: 205,
    deviationRatePct: 2.4,
    steps: ['术前评估', '腹腔镜手术', '术后恢复', '出院拆线'],
  },
];

export interface PathwayListResult {
  items: ClinicalPathway[];
  totalCount: number;
  demo: boolean;
}

export async function fetchClinicalPathways(): Promise<PathwayListResult> {
  try {
    const res = await get<{ items: ClinicalPathway[]; totalCount: number }>('/clinical-pathways');
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_PATHWAYS, totalCount: DEMO_PATHWAYS.length, demo: true };
  }
}
