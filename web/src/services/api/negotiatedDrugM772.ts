/**
 * 健澜科技 jlmedaios - 医保谈判药品 API（M772）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type NegotiatedDrugStatus = 'active' | 'stopped';

export interface NegotiatedDrug {
  id: string;
  code: string;
  name: string;
  price: number;
  paymentScope: string;
  status: NegotiatedDrugStatus;
  indications: string;
  reimbursementRatio: string;
  prescriptions: { date: string; patient: string; dept: string; qty: number }[];
}

export const NEG_DRUG_STATUS_META: Record<NegotiatedDrugStatus, { label: string; color: string }> = {
  active: { label: '在保', color: 'green' },
  stopped: { label: '已调出', color: 'default' },
};

const DEMO: NegotiatedDrug[] = [
  {
    id: "ND-001",
    code: "XN-2601",
    name: "甲磺酸奥希替尼片（80mg×30）",
    price: 5580,
    paymentScope: "EGFR T790M 阳性局部晚期或转移性非小细胞肺癌",
    status: "active",
    indications: "EGFR 突变非小细胞肺癌一线及二线治疗。",
    reimbursementRatio: "职工 70% / 居民 60%（双通道）",
    prescriptions: [
      { date: "2026-10-20", patient: "王患者", dept: "呼吸内科", qty: 1 },
      { date: "2026-10-18", patient: "李患者", dept: "肿瘤内科", qty: 1 },
    ],
  },
];

export interface NegotiatedDrugListResult {
  items: NegotiatedDrug[];
  demo: boolean;
}

export async function fetchNegotiatedDrugs(): Promise<NegotiatedDrugListResult> {
  try {
    const res = await get<{ items: NegotiatedDrug[] }>('/insurance/negotiated-drugs');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
