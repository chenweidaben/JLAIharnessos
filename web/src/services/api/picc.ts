/**
 * 健澜科技 jlmedaios - PICC 维护 API（M68-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { PiccMaintenance, RecordPiccInput } from '@/types/picc';

const base = '/picc-maintenances';

export function recordPicc(input: RecordPiccInput) {
  return post<PiccMaintenance>(base, input);
}
export function listPicc(patientId: string) {
  return get<PiccMaintenance[]>(base, { patientId });
}
