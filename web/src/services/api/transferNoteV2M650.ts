/**
 * 健澜科技 jlmedaios - 转科记录 v2 API（M650，配套 M577）
 *
 * 对接 BFF：GET /api/v1/transfer/notes + POST /api/v1/transfer/notes
 *   （未注册则 DEMO 兜底，打标 demo:true；POST 不做成功兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export interface TransferNote {
  id: string;
  patientId: string;
  fromDept: string;
  toDept: string;
  reason: string;
  summary: string;
  transferredAt: string;
  doctor: string;
}

export interface TransferNoteCreateInput {
  patientId: string;
  fromDept: string;
  toDept: string;
  reason: string;
  summary: string;
  doctor: string;
}

const DEMO_TRANSFERS: TransferNote[] = [
  { id: 'TN-001', patientId: 'P10009', fromDept: '急诊科', toDept: '心内科', reason: '急性冠脉综合征，需介入评估。', summary: 'ECG 示 V1-V4 ST 段抬高，肌钙蛋白升高，转心内科行急诊 PCI。', transferredAt: '2026-10-21T02:00:00+08:00', doctor: '刘医师' },
  { id: 'TN-002', patientId: 'P10011', fromDept: '呼吸科', toDept: 'ICU', reason: '呼吸衰竭，SpO2 持续 < 90%。', summary: '给予无创通气效果欠佳，转 ICU 行有创机械通气。', transferredAt: '2026-10-22T06:00:00+08:00', doctor: '陈主任' },
];

export interface TransferListResult {
  items: TransferNote[];
  totalCount: number;
  demo: boolean;
}

export async function fetchTransferNotes(patientId: string): Promise<TransferListResult> {
  try {
    const res = await get<{ items: TransferNote[]; totalCount: number }>('/transfer/notes', { patientId });
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_TRANSFERS.filter((t) => t.patientId === patientId), totalCount: 0, demo: true };
  }
}

export async function createTransferNote(input: TransferNoteCreateInput): Promise<TransferNote> {
  return post<TransferNote>('/transfer/notes', input);
}
