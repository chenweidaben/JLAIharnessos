import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { listView, suggestView, reviewView, DiagnosisError } from '../aggregators/diagnosisSuggestionAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof DiagnosisError) {
    const code = err.status === 403 ? ErrorCode.FORBIDDEN : err.status === 409 ? ErrorCode.CONFLICT : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const diagnosisSuggestionRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/diagnosis-suggestions', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      // v5.0试点扩展（M189 EMR/AI种子）：DEMO 种子由聚合器 listView 内部分支返回
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await listView(view, c.query.get('visitId') ?? ''))); } catch (e) { return mapError(e); }
    } },
  { method: 'POST', path: '/api/v1/diagnosis-suggestions/suggest', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await suggestView(view, (await c.body()) as Record<string, unknown>))); } catch (e) { return mapError(e); }
    } },
  { method: 'POST', path: '/api/v1/diagnosis-suggestions/:id/review', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        const b = (await c.body()) as Record<string, unknown>;
        return json(ok(await reviewView(view, c.params.id, Boolean(b.accepted), b.selectedDiagnosis ? String(b.selectedDiagnosis) : undefined)));
      } catch (e) { return mapError(e); }
    } },
];
