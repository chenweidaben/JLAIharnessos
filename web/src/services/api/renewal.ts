/**
 * 健澜科技 jlmedaios - 续方流转 API（M21-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { RenewalItem } from '@/types/renewal';

const base = '/renewal';

export function listMine(patientId: string) {
  return get<RenewalItem[]>(`${base}/mine`, { patientId });
}
export function pay(rxId: string) {
  return post<RenewalItem>(`${base}/${rxId}/pay`, {});
}
export function dispense(rxId: string) {
  return post<RenewalItem>(`${base}/${rxId}/dispense`, {});
}
