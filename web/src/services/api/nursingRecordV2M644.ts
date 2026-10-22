/**
 * 健澜科技 jlmedaios - 护理记录单 v2 API（M644，配套 M571）
 *
 * 对接 BFF：GET /api/v1/nursing/records + POST /api/v1/nursing/records
 *   （未注册则 DEMO 兜底，打标 demo:true；POST 不做成功兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export interface NursingRecordItem {
  id: string;
  patientId: string;
  recordType: 'vitals' | 'measure' | 'note';
  vitals?: string;
  measure: string;
  recordedAt: string;
  nurse: string;
}

export interface NursingRecordCreateInput {
  patientId: string;
  recordType: 'vitals' | 'measure' | 'note';
  vitals?: string;
  measure: string;
  nurse: string;
}

const DEMO_RECORDS: NursingRecordItem[] = [
  { id: 'NR-001', patientId: 'P10001', recordType: 'vitals', vitals: 'T 36.8℃ / P 78 / R 18 / BP 120/75 / SpO2 98%', measure: '', recordedAt: '2026-10-22T06:00:00+08:00', nurse: '周敏' },
  { id: 'NR-002', patientId: 'P10001', recordType: 'measure', vitals: '', measure: '晨晚间护理、协助翻身 q2h、压疮风险 25 分。', recordedAt: '2026-10-22T08:00:00+08:00', nurse: '李慧' },
  { id: 'NR-003', patientId: 'P10001', recordType: 'note', vitals: '', measure: '患者诉咳嗽较前减轻，无发热，情绪平稳。', recordedAt: '2026-10-22T10:00:00+08:00', nurse: '王芳' },
];

export interface NursingRecordListResult {
  items: NursingRecordItem[];
  totalCount: number;
  demo: boolean;
}

export async function fetchNursingRecords(patientId: string): Promise<NursingRecordListResult> {
  try {
    const res = await get<{ items: NursingRecordItem[]; totalCount: number }>('/nursing/records', { patientId });
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_RECORDS.filter((r) => r.patientId === patientId), totalCount: 0, demo: true };
  }
}

export async function createNursingRecord(input: NursingRecordCreateInput): Promise<NursingRecordItem> {
  return post<NursingRecordItem>('/nursing/records', input);
}
