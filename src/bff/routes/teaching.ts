/**
 * 健澜科技 jlmedaios - 教学管理路由（M140-C · 医院管理深化）
 *
 * 【医院管理深化】教学管理与规培考核直接挂钩：
 *   GET  /api/v1/admin/teaching?period=YYYY-MM
 *       返回教学计划台账 + 教学报表（计划数 / 学分 / 到勤率 /
 *       分类别汇总 / 带教老师工作量）；不传 period 默认本月。
 *   POST /api/v1/admin/teaching
 *       登记一条教学计划：{ courseName, teacherId, studentGroup, schedule, credits, dept }。
 *
 * 覆盖四类教学：规培生教学 / 实习生带教 / 继续教育讲座 / 三基三严培训。
 *
 * 鉴权：未登录 401 / admin 放行 / 其余需显式权限码
 *   teaching:view（看台账与报表）、teaching:record（登记计划），否则 403。
 *
 * 生产安全：纯聚合结果，不暴露患者级 PII；入参非法一律 400 结构化错误信封，
 *   不抛 500；落库 best-effort，断库不阻断主流程。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  createTeachingPlan,
  generateTeachingReport,
  listTeachingPlans,
  persistPlan,
  type Report,
} from '../aggregators/teachingAggregator';

/** 登记教学计划请求体 */
interface CreatePlanBody {
  courseName?: unknown;
  teacherId?: unknown;
  studentGroup?: unknown;
  schedule?: unknown;
  credits?: unknown;
  dept?: unknown;
}

/** 当前月 YYYY-MM（本地时区），作为未指定账期时的默认口径 */
function currentPeriod(): string {
  const now = new Date();
  const m = now.getMonth() + 1;
  return `${now.getFullYear()}-${m < 10 ? '0' : ''}${m}`;
}

export const teachingRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/teaching',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'teaching:view');
      if (denied) return denied;

      const period = c.query.get('period') || currentPeriod();

      try {
        const plans = listTeachingPlans();
        const report: Report = generateTeachingReport(period);
        return json(ok({ plans, report }, '教学管理台账已加载'));
      } catch (err) {
        const message = err instanceof Error ? err.message : '教学管理数据加载失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/admin/teaching',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'teaching:record');
      if (denied) return denied;

      let body: CreatePlanBody;
      try {
        body = await c.body<CreatePlanBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体必须为合法 JSON', c.traceId), 400);
      }

      try {
        const plan = createTeachingPlan(
          typeof body.courseName === 'string' ? body.courseName : '',
          typeof body.teacherId === 'string' ? body.teacherId : '',
          typeof body.studentGroup === 'string' ? body.studentGroup : '',
          typeof body.schedule === 'string' ? body.schedule : '',
          typeof body.credits === 'number' ? body.credits : Number(body.credits),
          typeof body.dept === 'string' ? body.dept : '',
        );
        // best-effort 落库持久化教学计划（断库降级，不阻断登记）
        await persistPlan(plan);
        return json(ok({ plan }, '教学计划登记成功'));
      } catch (err) {
        const message = err instanceof Error ? err.message : '教学计划登记失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
];
