/**
 * 健澜科技 jlmedaios - 智能病历草稿生成 BFF 路由（M126-A）
 *
 * POST /api/v1/assistant/record/draft
 *   body: {
 *     visitId: string,
 *     patientInfo?: DraftPatientInfo,
 *     symptoms?: string[],
 *     labs?: DraftLabItem[],
 *     diagnosis?: string[],
 *   }
 *   返回：七段式病历草稿（sections + 整稿 content）。
 *
 * 仅要求登录态（auth），不单独设权限码；统一错误信封。
 * 【AI能力升级】纯函数规则引擎生成，不落库、不调外部大模型；
 * 患者原始标识在聚合层统一脱敏，本接口不回显明文。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  generateMedicalRecordDraft,
  type DraftLabItem,
  type DraftPatientInfo,
} from '../aggregators/medicalRecordDraftAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

interface DraftBody {
  visitId?: string;
  patientInfo?: DraftPatientInfo;
  symptoms?: string[];
  labs?: DraftLabItem[];
  diagnosis?: string[];
}

export const assistantRecordDraftRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/assistant/record/draft',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        const body = await c.body<DraftBody>().catch(() => ({} as DraftBody));
        const visitId = (body?.visitId ?? '').trim();
        if (!visitId) {
          return json(fail(ErrorCode.BAD_REQUEST, 'visitId 不能为空'), 400);
        }
        // 【AI能力升级】纯函数规则引擎：医师仅作为操作人记录日志，草稿不落库
        const patientInfo = (body?.patientInfo ?? {}) as DraftPatientInfo;
        const symptoms = Array.isArray(body?.symptoms) ? body!.symptoms!.map(String) : [];
        const labs = Array.isArray(body?.labs) ? body!.labs! : [];
        const diagnosis = Array.isArray(body?.diagnosis) ? body!.diagnosis!.map(String) : [];
        const data = generateMedicalRecordDraft(visitId, patientInfo, symptoms, labs, diagnosis);
        return json(ok(data));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '病历草稿生成失败'),
          500,
        );
      }
    },
  },
];
