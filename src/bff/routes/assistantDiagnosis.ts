/**
 * 健澜科技 jlmedaios - 智能诊断建议 BFF 路由（M126-B）
 *
 * POST /api/v1/assistant/diagnosis/suggest
 *   body: {
 *     patientId: string,
 *     symptoms?:  { name: string; severity?: number; onset?: string }[],
 *     labResults?: { markerCode: string; value: number; refLow?: number|null; refHigh?: number|null }[],
 *     history?: { chronicDiseases?: string[]; surgeries?: string[]; smoking?: boolean; notes?: string }
 *   }
 *   返回：Top3 可能诊断（按概率排序）+ 支持依据 + 鉴别检查建议 + 危险警示。
 *
 * 仅要求登录态（auth），不单独设权限码；统一错误信封。
 * 规则引擎纯函数计算，不落库、不调大模型；患者标识返回时脱敏。
 * 数据安全与留痕要求：依据宪法第七章，全程只读、不落敏感明文。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  generateDiagnosisSuggestions,
  type DiagnosisHistoryInput,
  type DiagnosisLabInput,
  type DiagnosisSymptomInput,
} from '../aggregators/diagnosisSuggestionAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

interface SuggestBody {
  patientId?: string;
  symptoms?: DiagnosisSymptomInput[];
  labResults?: DiagnosisLabInput[];
  history?: DiagnosisHistoryInput;
}

export const assistantDiagnosisRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/assistant/diagnosis/suggest',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        const body = await c.body<SuggestBody>().catch(() => ({} as SuggestBody));
        const patientId = (body?.patientId ?? '').trim();
        if (!patientId) {
          return json(fail(ErrorCode.BAD_REQUEST, 'patientId 不能为空'), 400);
        }
        const symptoms = Array.isArray(body?.symptoms) ? body.symptoms : [];
        const labResults = Array.isArray(body?.labResults) ? body.labResults : [];
        const history = (body?.history ?? {}) as DiagnosisHistoryInput;
        // 纯函数规则引擎：患者 ID 仅传入，返回时脱敏
        const data = generateDiagnosisSuggestions(patientId, symptoms, labResults, history);
        return json(ok(data));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '诊断建议生成失败'),
          500,
        );
      }
    },
  },
];
