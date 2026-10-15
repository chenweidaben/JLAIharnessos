/**
 * 健澜科技 jlmedaios - AI 质控智能审核路由（M144-D）
 *
 * POST /api/v1/ai/quality-check   —— 对单条病历做六大核心条款质控
 * POST /api/v1/ai/quality-feedback —— 质控科人工复核结论回流（越用越准）
 * GET  /api/v1/ai/quality-report  —— 科室周期质控报告
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  AiQualityError,
  learnFromQualityFeedback,
  reportView,
  runQualityCheck,
  type RecordContent,
} from '../aggregators/aiQualityAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof AiQualityError) return json(fail(ErrorCode.FORBIDDEN, err.message), err.status);
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

interface CheckBody {
  recordId?: string;
  recordContent?: RecordContent;
}

interface FeedbackBody {
  recordId?: string;
  isError?: boolean;
  correction?: string;
}

export const aiQualityRoutes: RouteDef[] = [
  {
    method: 'POST', path: '/api/v1/ai/quality-check', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        const body = await c.body<CheckBody>();
        return json(ok(await runQualityCheck(view, body?.recordId ?? '', body?.recordContent ?? {})));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST', path: '/api/v1/ai/quality-feedback', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        if (!view.permissions.includes('ai_quality:check')) {
          throw new AiQualityError(403, '无 AI 质控审核权限');
        }
        const body = await c.body<FeedbackBody>();
        learnFromQualityFeedback(body?.recordId ?? '', body?.isError === true, body?.correction ?? null);
        return json(ok({ learned: true }));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET', path: '/api/v1/ai/quality-report', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        return json(ok(await reportView(view, c.query.get('dept') ?? '', c.query.get('period') ?? '')));
      } catch (e) { return mapError(e); }
    },
  },
];
