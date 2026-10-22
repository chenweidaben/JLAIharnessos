/**
 * 健澜科技 jlmedaios - 肿瘤科管理 API（M792）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type TreatPhase = 'neoadjuvant' | 'chemo' | 'radiation' | 'targeted' | 'immunotherapy' | 'palliative' | 'followup';

export const PHASE_META: Record<TreatPhase, { label: string; color: string }> = {
  neoadjuvant: { label: '新辅助', color: 'orange' },
  chemo: { label: '化疗', color: 'volcano' },
  radiation: { label: '放疗', color: 'purple' },
  targeted: { label: '靶向', color: 'blue' },
  immunotherapy: { label: '免疫', color: 'cyan' },
  palliative: { label: '姑息', color: 'default' },
  followup: { label: '随访', color: 'green' },
};

export interface OncPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  diagnosis: string;
  tnm: string;
  phase: TreatPhase;
  status: string;
  pathology: string;
  imaging: string;
  regimen: string;
  adverseEvents: { date: string; grade: string; event: string }[];
  nutrition: string;
}

const DEMO: OncPatient[] = [
  {
    id: 'ON-001',
    inpatientNo: 'ZY-261119',
    patient: '石患者',
    diagnosis: '左肺腺癌（EGFR 19del 阳性）',
    tnm: 'cT2N2M0 IIIA 期',
    phase: 'targeted',
    status: '治疗中',
    pathology: '术后病理：中分化腺癌，浸润脏层胸膜；淋巴结 4/12 转移；EGFR 19del 突变。',
    imaging: '胸部 CT：左肺下叶占位 3.5cm，纵隔 4R 淋巴结肿大；颅脑 MRI 未见转移。',
    regimen: '奥希替尼 80mg qd（EGFR-TKI 一线治疗），已用 4 月。',
    adverseEvents: [
      { date: '2026-10-15', grade: '1 级', event: '皮疹（痤疮样）' },
    ],
    nutrition: 'NRS-2002 评分 3 分，白蛋白 35 g/L；营养支持门诊干预。',
  },
];

export interface OncListResult {
  items: OncPatient[];
  demo: boolean;
}

export async function fetchOncPatients(): Promise<OncListResult> {
  try {
    const res = await get<{ items: OncPatient[] }>('/clinical/onc-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
