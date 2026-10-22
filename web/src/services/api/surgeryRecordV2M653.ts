/**
 * 健澜科技 jlmedaios - 手术记录 v2 API（M653，配套 M580）
 *
 * 对接 BFF：GET /api/v1/surgery/records + POST /api/v1/surgery/records
 *   （未注册则 DEMO 兜底，打标 demo:true；POST 不做成功兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export type IncisionClass = 'I' | 'II' | 'III' | 'IV';

export interface SurgeryRecord {
  id: string;
  patientId: string;
  surgeryName: string;
  surgeon: string;
  assistant?: string;
  anesthesiaType: string;
  incisionClass: IncisionClass;
  startedAt: string;
  finishedAt: string;
  operativeNote: string;
}

export interface SurgeryCreateInput {
  patientId: string;
  surgeryName: string;
  surgeon: string;
  assistant?: string;
  anesthesiaType: string;
  incisionClass: IncisionClass;
  operativeNote: string;
}

export const INCISION_META: Record<IncisionClass, { label: string; color: string }> = {
  I: { label: 'I 类（无菌）', color: 'green' },
  II: { label: 'II 类（清洁-污染）', color: 'blue' },
  III: { label: 'III 类（污染）', color: 'orange' },
  IV: { label: 'IV 类（脏）', color: 'red' },
};

const DEMO_RECORDS: SurgeryRecord[] = [
  { id: 'SR-001', patientId: 'P10002', surgeryName: '腹腔镜胆囊切除术', surgeon: '刘主任', assistant: '王医师', anesthesiaType: '全身麻醉（气管插管）', incisionClass: 'II', startedAt: '2026-10-21T09:00:00+08:00', finishedAt: '2026-10-21T10:30:00+08:00', operativeNote: '腹腔镜下顺利切除胆囊，无出血，无胆漏，放置腹腔引流 1 根。' },
  { id: 'SR-002', patientId: 'P10005', surgeryName: '冠状动脉支架植入术', surgeon: '陈主任', anesthesiaType: '局部麻醉（桡动脉入路）', incisionClass: 'I', startedAt: '2026-10-20T14:00:00+08:00', finishedAt: '2026-10-20T15:00:00+08:00', operativeNote: '前降支植入支架 1 枚，血流恢复 TIMI III 级。' },
];

export interface SurgeryListResult {
  items: SurgeryRecord[];
  totalCount: number;
  demo: boolean;
}

export async function fetchSurgeryRecords(patientId: string): Promise<SurgeryListResult> {
  try {
    const res = await get<{ items: SurgeryRecord[]; totalCount: number }>('/surgery/records', { patientId });
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_RECORDS.filter((r) => r.patientId === patientId), totalCount: 0, demo: true };
  }
}

export async function createSurgeryRecord(input: SurgeryCreateInput): Promise<SurgeryRecord> {
  return post<SurgeryRecord>('/surgery/records', input);
}
