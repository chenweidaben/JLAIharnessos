/**
 * 健澜科技 jlmedaios - 智能排班路由（M152-C · AI 能力深化）
 *
 *  POST /api/v1/admin/schedule/optimize  运行纯函数 optimizeSchedule 并落库 draft
 *  GET  /api/v1/admin/schedule            按科室 + 日期区间读取排班
 *
 *  权限：admin:schedule:optimize（运行优化）/ admin:schedule:view（查看）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { getDb } from '../../db/pool.js';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  getScheduleConflict,
  optimizeSchedule,
  type ScheduleConstraints,
} from '../aggregators/smartScheduleAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function guarded<T>(perm: string, fn: (c: Ctx, view: AuthView) => Promise<T>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, perm);
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try {
      return json(ok(await fn(c, view)));
    } catch (err) {
      const message = err instanceof Error ? err.message : '排班处理失败';
      return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
    }
  };
}

interface OptimizeBody {
  dept: string;
  startDate: string;
  endDate: string;
  staff: ScheduleConstraints['staff'];
  maxWorkdaysPerWeek?: number;
  minDayStaff?: number;
  minNightStaff?: number;
  requireAttendingDay?: boolean;
}

/** AI 能力深化：纯函数算完后，整段替换科室区间内的 draft 行（幂等 upsert）。 */
async function resetDraftRange(dept: string, startDate: string, endDate: string) {
  const db = getDb();
  await db`
    DELETE FROM clinical.smart_schedule
    WHERE dept_code = ${dept}
      AND shift_date BETWEEN ${startDate}::date AND ${endDate}::date
      AND status = 'draft'
  `;
  return db;
}

export const smartScheduleRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/admin/schedule/optimize',
    handle: guarded('admin:schedule:optimize', async (c, view) => {
      const body = await c.body<OptimizeBody>();
      if (!body?.dept || !body?.startDate || !body?.endDate) {
        return json(fail(ErrorCode.BAD_REQUEST, 'dept / startDate / endDate 必填'), 400);
      }
      if (!Array.isArray(body.staff) || body.staff.length === 0) {
        return json(fail(ErrorCode.BAD_REQUEST, 'staff 员工池不能为空'), 400);
      }
      const constraints: ScheduleConstraints = {
        staff: body.staff,
        maxWorkdaysPerWeek: body.maxWorkdaysPerWeek ?? 5,
        minDayStaff: body.minDayStaff ?? 2,
        minNightStaff: body.minNightStaff ?? 1,
        requireAttendingDay: body.requireAttendingDay ?? true,
      };
      const grid = optimizeSchedule(body.dept, body.startDate, body.endDate, constraints);
      const conflicts = getScheduleConflict({ assignments: grid.assignments, constraints });

      // 落库（draft）
      const db = await resetDraftRange(body.dept, body.startDate, body.endDate);
      for (const a of grid.assignments) {
        await db`
          INSERT INTO clinical.smart_schedule
            (dept_code, staff_id, staff_name, role, shift_date, shift_type, iso_year, iso_week, status, created_by)
          VALUES
            (${body.dept}, ${a.staffId}, ${a.staffName}, ${a.role}, ${a.date}::date, ${a.shift},
             EXTRACT(isoyear FROM ${a.date}::date)::int,
             EXTRACT(week FROM ${a.date}::date)::int,
             'draft', ${view.id})
          ON CONFLICT ON CONSTRAINT smart_schedule_one_shift_per_day DO UPDATE
             SET shift_type = EXCLUDED.shift_type, role = EXCLUDED.role, updated_at = now()
        `;
      }

      return { ...grid, conflicts };
    }),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/admin/schedule',
    handle: guarded('admin:schedule:view', async (c) => {
      const dept = c.query.get('dept');
      const startDate = c.query.get('startDate');
      const endDate = c.query.get('endDate');
      if (!dept || !startDate || !endDate) {
        return json(fail(ErrorCode.BAD_REQUEST, 'dept / startDate / endDate 必填'), 400);
      }
      const db = getDb();
      const rows = await db`
        SELECT dept_code, staff_id, staff_name, role, shift_date, shift_type, iso_year, iso_week, status
        FROM clinical.smart_schedule
        WHERE dept_code = ${dept}
          AND shift_date BETWEEN ${startDate}::date AND ${endDate}::date
        ORDER BY shift_date, shift_type, staff_id
      `;
      return { dept, startDate, endDate, rows };
    }),
    auth: true,
  },
];
