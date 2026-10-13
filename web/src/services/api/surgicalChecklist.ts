/**
 * 健澜科技 jlmedaios - 手术核查表 API（M82-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { post } from '../request';
import type { StageInput, SurgicalChecklist } from '@/types/surgicalChecklist';

const base = '/surgical-checklist';

export function createSurgicalChecklist(surgeryId: string) {
  return post<SurgicalChecklist>(`${base}/${surgeryId}`, {});
}
export function signinStage(id: string, input: StageInput) {
  return post<SurgicalChecklist>(`${base}/${id}/signin`, input);
}
export function timeoutStage(id: string, input: StageInput) {
  return post<SurgicalChecklist>(`${base}/${id}/timeout`, input);
}
export function signoutStage(id: string, input: StageInput) {
  return post<SurgicalChecklist>(`${base}/${id}/signout`, input);
}
