/**
 * 健澜科技 jlmedaios - 疼痛门诊 API（M52-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { PainClinicRecord, RecordResult } from '@/types/painClinic';

const base = '/pain-clinic';

export function recordPainClinic(input: {
  patientId: string; visitId?: string | null; baselineNrs: number; currentNrs: number;
  breakthroughCount?: number; analgesic: string; doseNote?: string | null; titrationRound?: number;
}) {
  return post<RecordResult>(`${base}`, input);
}
export function listPainClinic(patientId: string) {
  return get<PainClinicRecord[]>(`${base}`, { patientId });
}
