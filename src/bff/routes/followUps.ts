/**
 * 健澜科技 jlmedaios - 智能随访 BFF 路由（M131-A）
 *
 * GET /api/v1/patient/follow-ups  患者侧随访计划与提醒
 * GET /api/v1/doctor/follow-ups   医生侧分管患者随访计划
 *
 * AI能力深化：基于诊断自动分型生成术后/慢病/出院复诊随访。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  patientFollowUpsView,
  doctorFollowUpsView,
  FollowUpError,
} from '../aggregators/followUpAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof FollowUpError) {
    const code = err.status === 404 ? ErrorCode.NOT_FOUND
      : err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '随访查询失败'), 500);
}

export const followUpRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient/follow-ups',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'follow_up:view');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
      try {
        const result = await patientFollowUpsView(view, {
          diagnosis: c.query.get('diagnosis') ?? undefined,
          dischargeDate: c.query.get('dischargeDate') ?? undefined,
        });
        return json(ok(result));
      } catch (e) {
        return mapError(e);
      }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/doctor/follow-ups',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'follow_up:view');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
      try {
        const result = await doctorFollowUpsView(view, {
          patientId: c.query.get('patientId') ?? undefined,
          diagnosis: c.query.get('diagnosis') ?? undefined,
          dischargeDate: c.query.get('dischargeDate') ?? undefined,
        });
        return json(ok(result));
      } catch (e) {
        return mapError(e);
      }
    },
  },
];
