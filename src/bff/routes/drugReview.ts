/**
 * 健澜科技 jlmedaios - 合理用药实时审查 BFF 路由（AI 第八剑客）
 *
 * POST /api/v1/drug-review/scan?visitId=  触发一次在院医嘱实时审查；
 * GET  /api/v1/drug-review?visitId=       实时读取当前在院医嘱审查结果（同口径、不落库）。
 * 权限码 drug_review:view + 统一错误信封。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { DrugReviewError, reviewView, scanView } from '../aggregators/drugReviewAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof DrugReviewError) return json(fail(ErrorCode.FORBIDDEN, err.message), err.status);
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const drugReviewRoutes: RouteDef[] = [
  { method: 'POST', path: '/api/v1/drug-review/scan', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await scanView(view, c.query.get('visitId') ?? ''))); } catch (e) { return mapError(e); }
    } },
  { method: 'GET', path: '/api/v1/drug-review', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await reviewView(view, c.query.get('visitId') ?? ''))); } catch (e) { return mapError(e); }
    } },
];
