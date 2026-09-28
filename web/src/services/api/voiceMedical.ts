/**
 * 健澜科技 jlmedaios - 语音电子病历 API 服务（M2-C）
 *
 * 真实 BFF（src/bff/routes/voiceMedical.ts），全部读写 PostgreSQL，无 mock。
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { get, post } from '../request';
import type {
  ConvertDictationPayload,
  CreateDictationPayload,
  VoiceDictationDto,
  VoiceDictationStatus,
} from '@/types/voiceMedical';

/** 会话列表（默认本人；可按就诊 / 状态过滤）。 */
export function fetchDictations(params?: {
  visitId?: string;
  status?: VoiceDictationStatus;
}): Promise<{ items: VoiceDictationDto[]; total: number }> {
  const query = params
    ? '?' +
      Object.entries(params)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  return get<{ items: VoiceDictationDto[]; total: number }>(
    `/voice-medical/dictations${query}`,
  );
}

/** 发起口述转写（ASR + 医疗后处理，落 draft）。 */
export function dictate(
  payload: CreateDictationPayload,
): Promise<{ dictation: VoiceDictationDto }> {
  return post<{ dictation: VoiceDictationDto }>(
    '/voice-medical/dictations',
    payload,
  );
}

/** 会话详情。 */
export function fetchDictation(id: string): Promise<{ dictation: VoiceDictationDto }> {
  return get<{ dictation: VoiceDictationDto }>(
    `/voice-medical/dictations/${id}`,
  );
}

/** 复核转病历（医师本人签名）。 */
export function convertDictation(
  id: string,
  payload: ConvertDictationPayload,
): Promise<{ dictation: VoiceDictationDto; recordId: string }> {
  return post<{ dictation: VoiceDictationDto; recordId: string }>(
    `/voice-medical/dictations/${id}/convert`,
    payload,
  );
}

/** 作废会话（仅本人）。 */
export function discardDictation(
  id: string,
): Promise<{ dictation: VoiceDictationDto }> {
  return post<{ dictation: VoiceDictationDto }>(
    `/voice-medical/dictations/${id}/discard`,
    {},
  );
}
