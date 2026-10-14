/**
 * 健澜科技 jlmedaios - AI病历质控路由（M90-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { scanView, listView, AiNoteQcError } from '../aggregators/aiNoteQcAggregator.js';

/** 健澜科技：DEMO_MODE 下不连 PostgreSQL，GET 列表返回内存空兜底。 */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof AiNoteQcError) return json(fail(ErrorCode.FORBIDDEN, err.message), err.status);
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const aiNoteQcRoutes: RouteDef[] = [
  { method: 'POST', path: '/api/v1/ai-note-qc/scan', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await scanView(view, c.query.get('visitId') ?? ''))); } catch (e) { return mapError(e); }
    } },
  { method: 'GET', path: '/api/v1/ai-note-qc', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok([]));
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await listView(view, c.query.get('visitId') ?? ''))); } catch (e) { return mapError(e); }
    } },
];
