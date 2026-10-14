/**
 * 健澜科技 jlmedaios - 处方点评 BFF 路由
 *
 * GET  /api/v1/prescription-review   待点评处方列表 + 最近点评 + 结果统计；
 * POST /api/v1/prescription-review   提交点评结论（合理 / 不合理 / 超常 + 意见）。
 * 仅要求登录态（auth），不单独设权限码；统一错误信封。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  PrescriptionReviewError,
  listView,
  reviewView,
} from '../aggregators/prescriptionReviewAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof PrescriptionReviewError) {
    const code = err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const prescriptionReviewRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/prescription-review', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await listView(view))); } catch (e) { return mapError(e); }
    } },
  { method: 'POST', path: '/api/v1/prescription-review', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await reviewView(view, (await c.body()) as Record<string, unknown>))); } catch (e) { return mapError(e); }
    } },
];
