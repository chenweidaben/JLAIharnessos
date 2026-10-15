/**
 * 健澜科技 jlmedaios - 患者画像学习引擎 BFF 路由
 *
 *  - GET /api/v1/patients/:id/learning-profile
 *      聚合该患者历史就诊 / 医嘱 / 检验，输出结构化学习画像
 *      （慢病清单 / 药物反应 / 偏好治疗 / 近期就诊摘要 / 风险标志）。
 *
 * 权限：medmuse:view。
 * 隐私：响应仅含院内脱敏 patientId 与临床标签，不含姓名 / 身份证号。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { getPatientProfile, PatientProfileError } from '../aggregators/patientProfileAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof PatientProfileError) {
    return json(fail(ErrorCode.BAD_REQUEST, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : 'patient learning profile failed'), 500);
}

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

export const patientProfileRoutes: RouteDef[] = [
  {
    // 患者学习画像
    method: 'GET',
    path: '/api/v1/patients/:id/learning-profile',
    handle: guarded((c) => getPatientProfile(c.params.id)),
    auth: true,
  },
];
