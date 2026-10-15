/**
 * 健澜科技 jlmedaios - 病历 AI 语音录入与智能补全路由（M152-B）
 *
 * 【AI能力深化】
 *  POST /api/v1/record/voice-transcribe  医生口述 → 结构化病历（含模板填充）
 *  GET  /api/v1/record/smart-complete    输入时智能提示（常用主诉/诊断/用药）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  fillMedicalTemplate,
  smartCompleteMedicalRecord,
  voiceToMedicalRecord,
  type RecordType,
  type VoiceAudioInput,
} from '../aggregators/voiceRecordAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function asRecordType(v: unknown): RecordType {
  return v === 'admission' || v === 'consult' || v === 'discharge' ? v : 'progress';
}

export const voiceRecordRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/record/voice-transcribe',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      if (!view.permissions.includes('voice_record:transcribe')) {
        return json(fail(ErrorCode.FORBIDDEN, '无语音病历权限'), 403);
      }
      const body = (await c.body()) as Record<string, unknown>;
      const recordType = asRecordType(body.recordType);
      // 语音载荷：优先 audio 结构化对象，其次 transcript 文本
      const audio: VoiceAudioInput =
        (body.audio as VoiceAudioInput) ?? (typeof body.transcript === 'string' ? body.transcript : '');
      const record = voiceToMedicalRecord(audio, recordType);
      const template = fillMedicalTemplate(recordType, record);
      return json(ok({ record, template }));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/record/smart-complete',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      if (!view.permissions.includes('voice_record:complete')) {
        return json(fail(ErrorCode.FORBIDDEN, '无智能补全权限'), 403);
      }
      const text = c.query.get('text') ?? '';
      const dept = c.query.get('dept') ?? '';
      const recordType = asRecordType(c.query.get('recordType'));
      const completions = smartCompleteMedicalRecord(text, { dept, recordType });
      return json(ok({ completions }));
    },
  },
];
