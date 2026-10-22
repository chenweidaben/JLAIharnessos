/**
 * 健澜科技 jlmedaios - 病历质控 v2 API（M670，配套 M566）
 *
 * 对接 BFF：GET /api/v1/medical-records/quality
 *   （未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type RectifyStatus = 'pending' | 'rectifying' | 'rectified';

export interface MedicalRecordQuality {
  id: string;
  recordNo: string;
  dept: string;
  doctor: string;
  defectType: string;
  deduction: number;
  finalScore: number;
  status: RectifyStatus;
  comment: string;
}

export const RECTIFY_META: Record<RectifyStatus, { label: string; color: string }> = {
  pending: { label: '待整改', color: 'red' },
  rectifying: { label: '整改中', color: 'orange' },
  rectified: { label: '已整改', color: 'green' },
};

const DEMO_QA: MedicalRecordQuality[] = [
  { id: 'QA-001', recordNo: 'EMR-2601', dept: '呼吸科', doctor: '王医师', defectType: '首次病程未在 8h 内完成', deduction: 5, finalScore: 92, status: 'rectifying', comment: '已通知补录，24h 内完成。' },
  { id: 'QA-002', recordNo: 'EMR-2602', dept: '普外科', doctor: '李医师', defectType: '出院小结诊断不规范', deduction: 3, finalScore: 96, status: 'rectified', comment: '已按 ICD-10 规范修改。' },
  { id: 'QA-003', recordNo: 'EMR-2603', dept: '心内科', doctor: '陈医师', defectType: '手术记录未在 24h 内完成', deduction: 8, finalScore: 88, status: 'pending', comment: '' },
];

export interface QualityListResult {
  items: MedicalRecordQuality[];
  totalCount: number;
  demo: boolean;
}

export async function fetchMedicalRecordQuality(): Promise<QualityListResult> {
  try {
    const res = await get<{ items: MedicalRecordQuality[]; totalCount: number }>('/medical-records/quality');
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_QA, totalCount: DEMO_QA.length, demo: true };
  }
}
