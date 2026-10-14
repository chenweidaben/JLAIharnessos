import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { trendView, VitalsError } from '../aggregators/vitalsTrendAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

export const vitalsTrendRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/vitals-trend', auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c); if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await trendView(view, c.query.get('visitId') ?? ''))); }
      catch (e) { return json(fail(ErrorCode.BAD_REQUEST, e instanceof Error ? e.message : '失败'), 400); }
    } },
];
