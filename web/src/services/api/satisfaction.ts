/**
 * 健澜科技 jlmedaios - 满意度评价 API（M3-O）
 * 相对路径（业务 API 禁 /api/v1 全路径，避免双前缀）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type {
  SatisfactionSurvey,
  SatisfactionStats,
  SatisfactionSource,
  SurveyScoresInput,
} from '@/types/satisfaction';

/** 患者本人提交评价。 */
export async function submitMySurveyApi(
  input: SurveyScoresInput,
): Promise<{ survey: SatisfactionSurvey; created: boolean }> {
  return post<{ survey: SatisfactionSurvey; created: boolean }>(`/satisfaction/my`, input);
}

/** 医护代提交评价。 */
export async function submitSurveyByStaffApi(
  input: SurveyScoresInput,
): Promise<{ survey: SatisfactionSurvey; created: boolean }> {
  return post<{ survey: SatisfactionSurvey; created: boolean }>(`/satisfaction/staff`, input);
}

/** 患者：我的评价。 */
export async function listMySurveysApi(): Promise<SatisfactionSurvey[]> {
  return get<SatisfactionSurvey[]>(`/satisfaction/my`);
}

/** 医护：评价列表。 */
export async function listSurveysApi(input: {
  patientId?: string;
  sourceType?: SatisfactionSource;
}): Promise<SatisfactionSurvey[]> {
  const params = new URLSearchParams();
  if (input.patientId) params.set('patientId', input.patientId);
  if (input.sourceType) params.set('sourceType', input.sourceType);
  const qs = params.toString();
  return get<SatisfactionSurvey[]>(`/satisfaction/list${qs ? `?${qs}` : ''}`);
}

/** 医护：满意度统计。 */
export async function getSatisfactionStatsApi(
  sourceType?: SatisfactionSource,
): Promise<SatisfactionStats> {
  const qs = sourceType ? `?sourceType=${encodeURIComponent(sourceType)}` : '';
  return get<SatisfactionStats>(`/satisfaction/stats${qs}`);
}
