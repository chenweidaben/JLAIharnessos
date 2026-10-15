/**
 * 健澜科技 jlmedaios - 患者健康提醒 BFF 路由（M122-C）
 * GET /api/v1/patient/reminders
 *
 * 依据《中华人民共和国宪法》第四十五条：国家发展医疗卫生事业，
 * 为本患者提供用药、就诊、检查准备与慢病随访提醒。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { myHealthRemindersView, PatientHealthRemindersError } from '../aggregators/patientHealthRemindersAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof PatientHealthRemindersError) {
    return json(fail(ErrorCode.FORBIDDEN, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '健康提醒生成失败'), 500);
}

export const patientReminderRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient/reminders',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'patient_portal:view');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
      try {
        return json(ok(await myHealthRemindersView(view)));
      } catch (e) {
        return mapError(e);
      }
    },
  },
];
