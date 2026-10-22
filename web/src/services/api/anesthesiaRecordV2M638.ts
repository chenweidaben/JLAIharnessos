/**
 * 健澜科技 jlmedaios - 麻醉记录 v2 API（M638，配套 M562）
 *
 * 对接 BFF：GET /api/v1/anesthesia/records + POST /api/v1/anesthesia/records
 *   （未注册则 DEMO 兜底，打标 demo:true；POST 不做成功兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export interface AnesthesiaRecordItem {
  id: string;
  surgeryId: string;
  patientId: string;
  anesthesiologist: string;
  startAt: string;
  endAt: string;
  preopAssessment: string;
  medications: string;
  vitalsSummary: string;
}

export interface AnesthesiaCreateInput {
  surgeryId: string;
  patientId: string;
  anesthesiologist: string;
  preopAssessment: string;
}

const DEMO_RECORDS: AnesthesiaRecordItem[] = [
  { id: 'AN-001', surgeryId: 'S-2601', patientId: 'P10001', anesthesiologist: '陈麻醉', startAt: '2026-10-22T09:00:00+08:00', endAt: '2026-10-22T10:30:00+08:00', preopAssessment: 'ASA II，气道评估 Mallampati II。', medications: '丙泊酚 120mg + 瑞芬太尼 80ug + 罗库溴铵 50mg。', vitalsSummary: 'HR 75-92，BP 118-135/74-85，SpO2 98-99%。' },
  { id: 'AN-002', surgeryId: 'S-2602', patientId: 'P10002', anesthesiologist: '周麻醉', startAt: '2026-10-21T14:00:00+08:00', endAt: '2026-10-21T15:20:00+08:00', preopAssessment: 'ASA I，常规。', medications: '七氟烷吸入 + 芬太尼 0.1mg。', vitalsSummary: 'HR 68-78，BP 120-130/75-82，SpO2 99%。' },
];

export interface AnesthesiaListResult {
  items: AnesthesiaRecordItem[];
  totalCount: number;
  demo: boolean;
}

export async function fetchAnesthesiaRecords(patientId: string): Promise<AnesthesiaListResult> {
  try {
    const res = await get<{ items: AnesthesiaRecordItem[]; totalCount: number }>('/anesthesia/records', { patientId });
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_RECORDS.filter((r) => r.patientId === patientId), totalCount: 0, demo: true };
  }
}

export async function createAnesthesiaRecord(input: AnesthesiaCreateInput): Promise<AnesthesiaRecordItem> {
  return post<AnesthesiaRecordItem>('/anesthesia/records', input);
}
