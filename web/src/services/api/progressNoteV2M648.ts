/**
 * 健澜科技 jlmedaios - 病程记录 v2 API（M648，配套 M575）
 *
 * 对接 BFF：GET /api/v1/progress/notes + POST /api/v1/progress/notes
 *   （未注册则 DEMO 兜底，打标 demo:true；POST 不做成功兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export type ProgressNoteType = 'first' | 'daily' | 'senior' | 'handover';

export interface ProgressNote {
  id: string;
  patientId: string;
  noteType: ProgressNoteType;
  content: string;
  notedAt: string;
  doctor: string;
}

export interface ProgressNoteCreateInput {
  patientId: string;
  noteType: ProgressNoteType;
  content: string;
  doctor: string;
}

export const PROGRESS_TYPE_META: Record<ProgressNoteType, { label: string; color: string }> = {
  first: { label: '首次病程', color: 'purple' },
  daily: { label: '日常病程', color: 'blue' },
  senior: { label: '上级医师查房', color: 'orange' },
  handover: { label: '交接班', color: 'cyan' },
};

const DEMO_NOTES: ProgressNote[] = [
  { id: 'PN-001', patientId: 'P10001', noteType: 'first', content: '入院诊断明确：社区获得性肺炎。查体：T 38.2℃，右下肺湿啰音。治疗：抗感染、化痰、补液。', notedAt: '2026-10-20T12:00:00+08:00', doctor: '王医师' },
  { id: 'PN-002', patientId: 'P10001', noteType: 'daily', content: '咳嗽较前减轻，T 37.5℃，继续当前抗感染方案，明日复查血常规 + CRP。', notedAt: '2026-10-21T09:00:00+08:00', doctor: '王医师' },
  { id: 'PN-003', patientId: 'P10001', noteType: 'senior', content: '李主任查房：患者肺炎治疗有效，关注氧合与尿量，警惕心衰。', notedAt: '2026-10-22T08:30:00+08:00', doctor: '李主任' },
];

export interface ProgressListResult {
  items: ProgressNote[];
  totalCount: number;
  demo: boolean;
}

export async function fetchProgressNotes(patientId: string): Promise<ProgressListResult> {
  try {
    const res = await get<{ items: ProgressNote[]; totalCount: number }>('/progress/notes', { patientId });
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_NOTES.filter((n) => n.patientId === patientId), totalCount: 0, demo: true };
  }
}

export async function createProgressNote(input: ProgressNoteCreateInput): Promise<ProgressNote> {
  return post<ProgressNote>('/progress/notes', input);
}
