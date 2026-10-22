/**
 * 健澜科技 jlmedaios - 手术知情同意 v2 API（M646，配套 M573）
 *
 * 对接 BFF：GET /api/v1/surgery/consents
 *   （未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ConsentStatus = 'draft' | 'patient_signed' | 'doctor_signed' | 'archived';

export interface SurgeryConsent {
  id: string;
  patientId: string;
  surgeryName: string;
  riskNote: string;
  patientSignedAt: string | null;
  doctorSignedAt: string | null;
  doctorName: string;
  status: ConsentStatus;
}

export const CONSENT_STATUS_META: Record<ConsentStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  patient_signed: { label: '患者已签', color: 'orange' },
  doctor_signed: { label: '双签完成', color: 'blue' },
  archived: { label: '已归档', color: 'green' },
};

const DEMO_CONSENTS: SurgeryConsent[] = [
  { id: 'SC-001', patientId: 'P10002', surgeryName: '腹腔镜胆囊切除术', riskNote: '出血、胆漏、胆管损伤、中转开腹可能。', patientSignedAt: '2026-10-21T15:00:00+08:00', doctorSignedAt: '2026-10-21T15:30:00+08:00', doctorName: '刘主任', status: 'archived' },
  { id: 'SC-002', patientId: 'P10005', surgeryName: '冠状动脉支架植入术', riskNote: '造影剂过敏、心律失常、血管损伤、支架内血栓。', patientSignedAt: '2026-10-22T09:00:00+08:00', doctorSignedAt: null, doctorName: '陈医师', status: 'patient_signed' },
  { id: 'SC-003', patientId: 'P10008', surgeryName: '甲状腺次全切除术', riskNote: '喉返神经损伤、低钙抽搐、出血。', patientSignedAt: null, doctorSignedAt: null, doctorName: '王主任', status: 'draft' },
];

export interface ConsentListResult {
  items: SurgeryConsent[];
  totalCount: number;
  demo: boolean;
}

export async function fetchSurgeryConsents(patientId: string): Promise<ConsentListResult> {
  try {
    const res = await get<{ items: SurgeryConsent[]; totalCount: number }>('/surgery/consents', { patientId });
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_CONSENTS.filter((c) => c.patientId === patientId), totalCount: 0, demo: true };
  }
}
