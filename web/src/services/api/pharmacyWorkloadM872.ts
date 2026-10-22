/**
 * 健澜科技 jlmedaios - 药剂科管理 API（M872）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PharmacyWorkload {
  id: string;
  date: string;
  outpatientPrescriptions: number;
  inpatientOrders: number;
  auc: number;
  prescriptionReviews: number;
  status: string;
  reviewResults: { name: string; count: number }[];
  aucDetail: string;
  controlledDrugs: string;
  adr: string;
}

const DEMO: PharmacyWorkload[] = [
  {
    id: 'PH-872',
    date: '2026-10-22',
    outpatientPrescriptions: 2400,
    inpatientOrders: 860,
    auc: 45.2,
    prescriptionReviews: 120,
    status: '正常运行',
    reviewResults: [
      { name: '合理处方', count: 112 },
      { name: '不合理处方（用法不适宜）', count: 4 },
      { name: '不合理处方（遴选不适宜）', count: 2 },
      { name: '不合理处方（重复用药）', count: 2 },
    ],
    aucDetail: '抗菌药物使用强度（DDDs）：45.2 DDDs/100 人天（目标 ≤40）；三代头孢占比 18%（目标 ≤15%）。',
    controlledDrugs: '特殊药品管理（麻精药品）：麻醉药品处方 28 张；第一类精神药品 12 张；空安瓿回收登记 100%；账物相符率 100%。',
    adr: '药品不良反应（ADR）报告：8 例（一般 6/严重 2；已上报国家 ADR 监测系统）。',
  },
];

export interface PharmacyWorkloadListResult {
  items: PharmacyWorkload[];
  demo: boolean;
}

export async function fetchPharmacyWorkload(): Promise<PharmacyWorkloadListResult> {
  try {
    const res = await get<{ items: PharmacyWorkload[] }>('/pharmacy/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
