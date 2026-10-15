/**
 * 健澜科技 jlmedaios - 住院医生工作站「越用越懂患者」路由
 *   （依据宪法第四章：AI 原生医院以患者为中心）
 *
 *  - GET /api/v1/inpatients/:id/insight
 *      返回该住院患者当日病情洞察（关键事件 / 风险标记 / 今日重点关注）。
 *
 * 权限：medmuse:view。
 * 隐私：响应仅含院内脱敏 patientId 与临床标签，不含姓名 / 身份证号 / 床号明文。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { getInpatientInsight, InpatientInsightError } from '../aggregators/inpatientInsightAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof InpatientInsightError) {
    const code = err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'inpatient insight failed'), 500);
}

/** 权限守卫：medmuse:view */
function guarded<T>(fn: (c: Ctx, view: AuthView) => Promise<T>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, 'medmuse:view');
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
    try {
      return json(ok(await fn(c, view)));
    } catch (e) {
      return mapError(e);
    }
  };
}

export const inpatientInsightRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/inpatients/:id/insight',
    auth: true,
    handle: guarded((c, view) =>
      getInpatientInsight(view, c.params.id ?? '', c.query.get('date') ?? undefined),
    ),
  },
];
