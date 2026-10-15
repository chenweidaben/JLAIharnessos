/**
 * 健澜科技 jlmedaios - 患者端 H5 首页 BFF 路由（M148-C，产品化收尾）
 * GET /api/v1/patient/h5/home
 *
 * 面向患者本人的 H5 一站式首页：我的预约 / 我的报告 / 我的账单 /
 * 健康提醒（用药 / 复诊 / 接种）/ 智能导诊。依据《中华人民共和国宪法》
 * 第四十五条发展医疗卫生事业、保护人民健康的要求，为患者提供大字大按钮、
 * 易懂文案的自助健康入口。
 *
 * 移动端 + 性能优化：仅登录鉴权 + patient 角色校验，不触碰 WebSocket，
 * 不新增权限码；数据装配后调用纯函数一次性聚合，便于后续加缓存。
 *
 * 生产安全加固：纯聚合器内完成姓名 / 手机号脱敏，身份证号绝不下发。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { myHealthRemindersView } from '../aggregators/patientHealthRemindersAggregator';
import {
  buildPatientH5Dashboard,
  isPatientRole,
  type H5Reminder,
  type H5ReminderKind,
} from '../aggregators/patientH5Aggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

/**
 * 把健康提醒聚合结果映射为 H5 统一健康提醒列表。
 * 产品化收尾：用药 → medication；复诊 / 检查准备 / 慢病随访 → followup；
 * 接种提醒后续接入 vaccinationRepo 后在此装配。
 */
function toH5Reminders(
  reminders: Awaited<ReturnType<typeof myHealthRemindersView>>,
): H5Reminder[] {
  const out: H5Reminder[] = [];
  const push = (kind: H5ReminderKind, list: typeof reminders.medicationReminders) => {
    for (const r of list) {
      out.push({ id: r.id, kind, level: r.level, title: r.title, body: r.body, dueAt: r.dueAt });
    }
  };
  push('medication', reminders.medicationReminders);
  push('followup', reminders.appointmentReminders);
  push('followup', reminders.prepReminders);
  push('followup', reminders.chronicCareReminders);
  // vaccination：待接种计划接入后装配，当前为空，保证首页可用。
  return out;
}

export const patientH5Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient/h5/home',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'patient_portal:view');
      if (denied) return denied;

      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
      // 权限校验（产品化收尾）：仅患者本人可访问 H5 首页
      if (!isPatientRole(view.rawRoles)) {
        return json(fail(ErrorCode.FORBIDDEN, '仅患者本人可访问 H5 首页'), 403);
      }

      try {
        // 健康提醒：复用已上线的健康提醒聚合（用药/复诊/检查准备/慢病随访）
        const reminders = await myHealthRemindersView(view);

        // 纯函数聚合：不读外部状态，便于单测与缓存
        // 产品化收尾：预约 / 报告 / 账单后续接入对应患者维度仓储后在此装配，
        // 当前给安全默认值（空列表），脱敏在聚合器内统一完成。
        const dashboard = buildPatientH5Dashboard(
          view.id,
          {
            profile: {
              name: view.realName,
              phone: view.phone || null,
              // 身份证号不传入聚合器，从源头杜绝下发
            },
            appointments: [],
            reports: [],
            bills: [],
            reminders: toH5Reminders(reminders),
            guide: { available: true },
          },
          new Date(),
        );
        return json(ok(dashboard));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : 'H5 首页加载失败'),
          500,
        );
      }
    },
  },
];

export default patientH5Routes;
