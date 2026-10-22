/**
 * 健澜科技 jlmedaios - 神经外科管理 API（M795）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface NeuroSurgPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  diagnosis: string;
  gcs: number;
  opApproach: string;
  status: string;
  preImaging: string;
  opRecord: string;
  postGcs: string;
  icp: string;
  rehab: string;
}

const DEMO: NeuroSurgPatient[] = [
  {
    id: 'NS-001',
    inpatientNo: 'ZY-261122',
    patient: '何患者',
    diagnosis: '右侧大脑半球凸面脑膜瘤',
    gcs: 15,
    opApproach: '右额开颅肿瘤切除术（冠状皮瓣，矢状窦旁入路）',
    status: '术后第 6 天',
    preImaging: '头颅 MRI 增强：右额凸面类圆形均匀强化占位 4.5cm，广基与硬脑膜相连。',
    opRecord: '肿瘤 SMO 完全切除，矢状窦壁电灼处理；术中出血 200 mL，未输红细胞。',
    postGcs: '术后即刻 GCS E4V5M6=15；术后第 1 天短暂嗜睡（GCS 14），第 2 天恢复 15。',
    icp: '有创颅内压监测 24h：峰值 18 mmHg，平均 12 mmHg，未持续 >20。',
    rehab: '右下肢轻瘫（IV 级），已转康复科行步态 + 肌力训练。',
  },
];

export interface NeuroSurgListResult {
  items: NeuroSurgPatient[];
  demo: boolean;
}

export async function fetchNeuroSurgPatients(): Promise<NeuroSurgListResult> {
  try {
    const res = await get<{ items: NeuroSurgPatient[] }>('/clinical/neuro-surg-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
