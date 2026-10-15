/**
 * 健澜科技 jlmedaios - 患者移动端 H5 首页 BFF 路由（M128-C）
 * GET /api/v1/patient/mobile/home
 *
 * 面向中老年患者本人的移动端首页聚合：今日提醒、最近报告、智能导诊、
 * 满意度评价。依据《中华人民共和国宪法》第四十五条发展医疗卫生事业、
 * 保护人民健康的要求，为患者提供大字大按钮、易懂文案的自助健康入口。
 *
 * 移动端 + 性能优化：仅登录鉴权，不触碰 WebSocket，不新增权限码；
 * 数据装配后调用纯函数一次性聚合，便于后续加缓存。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { myHealthRemindersView } from '../aggregators/patientHealthRemindersAggregator';
import {
  buildPatientMobileHome,
  type MobileReminder,
  type MobileReminderType,
} from '../aggregators/patientMobileAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

/**
 * 把健康提醒聚合结果映射为移动端统一提醒列表。
 * 移动端 + 性能优化：一次遍历合并四类提醒，再交给纯函数排序限量。
 */
function toMobileReminders(reminders: Awaited<ReturnType<typeof myHealthRemindersView>>): MobileReminder[] {
  const out: MobileReminder[] = [];
  const push = (type: MobileReminderType, list: typeof reminders.medicationReminders) => {
    for (const r of list) {
      out.push({ id: r.id, type, level: r.level, title: r.title, body: r.body, dueAt: r.dueAt });
    }
  };
  push('medication', reminders.medicationReminders);
  push('appointment', reminders.appointmentReminders);
  push('exam', reminders.prepReminders);
  push('appointment', reminders.chronicCareReminders);
  return out;
}

export const patientMobileHomeRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient/mobile/home',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'patient_portal:view');
      if (denied) return denied;

      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
      if (!view.rawRoles.includes('patient')) {
        return json(fail(ErrorCode.FORBIDDEN, '仅患者本人可访问移动端首页'), 403);
      }

      try {
        // 今日提醒：复用已上线的健康提醒聚合（用药/复诊/检查准备/慢病随访）
        const reminders = await myHealthRemindersView(view);

        // 纯函数聚合：不读外部状态，便于单测与缓存
        const home = buildPatientMobileHome(
          view.id,
          {
            reminders: toMobileReminders(reminders),
            // 最近报告 / 智能导诊 / 满意度：后续接入对应仓储后在此装配，
            // 当前先给安全默认值，保证首页可用。
            reports: [],
            guide: { available: true },
            satisfaction: { pending: false },
          },
          new Date(),
        );
        return json(ok(home));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '移动端首页加载失败'),
          500,
        );
      }
    },
  },
];

export default patientMobileHomeRoutes;
