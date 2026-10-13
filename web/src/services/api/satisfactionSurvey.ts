/**
 * 健澜科技 jlmedaios - 满意度 API（M63-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { RankingResult, SubmitInput, SurveyRow } from '@/types/satisfactionSurvey';

const base = '/satisfaction-surveys';

export function submitSurvey(input: SubmitInput) {
  return post<SurveyRow>(base, input);
}
export function surveyRanking() {
  return get<RankingResult>(`${base}/ranking`);
}
export function listSurveyByVisit(visitId: string) {
  return get<{ items: Array<SurveyRow & { avg: number; lowDims: string[] }> }>(base, { visitId });
}
