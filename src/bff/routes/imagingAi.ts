/**
 * 健澜科技 jlmedaios - 医学影像 AI 辅助 BFF 路由（M138-A · 新业务场景）
 *
 * POST /api/v1/imaging/ai/analyze
 *   body: { studyType: 'chest_xray'|'ct'|'xray', imageFeatures: {...} }
 *   返回: { suggestion: AiSuggestion, report: Report }
 *
 * 医疗安全红线：
 *   - 本接口只做规则初筛，返回值自带 disclaimer；
 *   - 不直连 PACS、不调 LLM、不写患者诊断结论；
 *   - 医师确认动作（前端按钮）走后续审计流程，不在本接口内落诊断。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  analyzeImaging,
  generateImagingReport,
  type ImageFeatures,
  type StudyType,
} from '../aggregators/imagingAiAggregator.js';

const VALID_STUDY_TYPES: readonly StudyType[] = ['chest_xray', 'ct', 'xray'];

class ImagingAiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ImagingAiError';
  }
}

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof ImagingAiError) {
    const code =
      err.status === 400
        ? ErrorCode.BAD_REQUEST
        : err.status === 401
          ? ErrorCode.UNAUTHORIZED
          : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '影像 AI 分析失败'), 500);
}

export const imagingAiRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/imaging/ai/analyze',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);

      try {
        const body = (await c.body().catch(() => ({}))) as {
          studyType?: string;
          imageFeatures?: ImageFeatures;
        };

        if (!body.studyType || !VALID_STUDY_TYPES.includes(body.studyType as StudyType)) {
          throw new ImagingAiError(400, 'BAD_REQUEST', 'studyType 必须是 chest_xray / ct / xray 之一');
        }
        const studyType = body.studyType as StudyType;
        const features: ImageFeatures =
          body.imageFeatures && typeof body.imageFeatures === 'object' ? body.imageFeatures : {};

        // 【新业务场景】纯函数：规则初筛 + 报告草稿
        const suggestion = analyzeImaging(studyType, features);
        const report = generateImagingReport(studyType, suggestion.findings);

        return json(ok({ suggestion, report }));
      } catch (err) {
        return mapError(err);
      }
    },
  },
];
