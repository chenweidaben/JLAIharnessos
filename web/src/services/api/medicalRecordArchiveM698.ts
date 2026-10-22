/**
 * 健澜科技 jlmedaios - 病历归档管理 API（M698）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ArchiveStatus = 'pending' | 'archiving' | 'archived';

export interface MedicalRecordArchive {
  id: string;
  inpatientNo: string;
  patientId: string;
  dischargeDate: string;
  archivedAt: string | null;
  status: ArchiveStatus;
  completenessChecklist: { item: string; present: boolean }[];
  missingItems: string[];
}

export const ARCHIVE_STATUS_META: Record<ArchiveStatus, { label: string; color: string }> = {
  pending: { label: '待归档', color: 'orange' },
  archiving: { label: '归档中', color: 'processing' },
  archived: { label: '已归档', color: 'green' },
};

const DEMO: MedicalRecordArchive[] = [
  {
    id: 'ARC-001',
    inpatientNo: 'ZY-2601',
    patientId: 'P10002',
    dischargeDate: '2026-10-22',
    archivedAt: null,
    status: 'pending',
    completenessChecklist: [
      { item: '入院记录', present: true },
      { item: '首次病程', present: true },
      { item: '手术记录', present: true },
      { item: '出院小结', present: false },
      { item: '知情同意书', present: true },
    ],
    missingItems: ['出院小结'],
  },
  {
    id: 'ARC-002',
    inpatientNo: 'ZY-2599',
    patientId: 'P10015',
    dischargeDate: '2026-10-20',
    archivedAt: '2026-10-22T09:00:00+08:00',
    status: 'archived',
    completenessChecklist: [
      { item: '入院记录', present: true },
      { item: '首次病程', present: true },
      { item: '出院小结', present: true },
      { item: '知情同意书', present: true },
    ],
    missingItems: [],
  },
];

export interface ArchiveListResult {
  items: MedicalRecordArchive[];
  demo: boolean;
}

export async function fetchMedicalRecordArchives(): Promise<ArchiveListResult> {
  try {
    const res = await get<{ items: MedicalRecordArchive[] }>('/medical-records/archives');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
