/**
 * 健澜科技 jlmedaios - 医患沟通记录 API（M757）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type CommStatus = 'recorded' | 'signed';

export interface CommunicationRecord {
  id: string;
  patient: string;
  type: string;
  heldAt: string;
  staff: string;
  status: CommStatus;
  content: string;
  conclusion: string;
  signedBy: string;
}

export const COMM_STATUS_META: Record<CommStatus, { label: string; color: string }> = {
  recorded: { label: '已记录', color: 'blue' },
  signed: { label: '已签字', color: 'green' },
};

const DEMO: CommunicationRecord[] = [
  {
    id: 'CR-001',
    patient: '张患者（住院部 12 床）',
    type: '术前谈话',
    heldAt: '2026-10-22 09:30',
    staff: '普外科 陈医师',
    status: 'signed',
    content: '向患者及家属讲解腹腔镜胆囊切除手术方案、风险、替代方案。',
    conclusion: '患者及家属理解并同意手术，签署知情同意书。',
    signedBy: '患者本人 + 家属（配偶）',
  },
];

export interface CommListResult {
  items: CommunicationRecord[];
  demo: boolean;
}

export async function fetchCommunicationRecords(): Promise<CommListResult> {
  try {
    const res = await get<{ items: CommunicationRecord[] }>('/patient-service/communication-records');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
