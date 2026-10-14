import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { listView, updateView, EmrAssessmentError } from '../aggregators/emrAssessmentAggregator.js';

/** 健澜科技：DEMO_MODE 下不连 PostgreSQL，GET 列表返回内存空兜底。 */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof EmrAssessmentError) {
    return json(fail(err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.NOT_FOUND, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const emrAssessmentRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emr-assessment', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (isDemo) return json(ok([]));
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await listView(view))); } catch (e) { return mapError(e); }
    } },
  { method: 'POST', path: '/api/v1/emr-assessment/:code/measure', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(await updateView(view, c.params.code, Number(b.value ?? 0))));
      } catch (e) { return mapError(e); }
    } },
];
