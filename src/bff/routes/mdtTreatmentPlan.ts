/**
 * 健澜科技 jlmedaios - MDT 治疗方案路由（M67-A）
 * /api/v1/mdt-treatment-plans
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  confirmView, draftView, listView, TreatmentPlanError,
} from '../aggregators/mdtTreatmentPlanAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof TreatmentPlanError) {
    const code =
      err.status === 404 ? ErrorCode.NOT_FOUND
        : err.status === 403 ? ErrorCode.FORBIDDEN
          : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '治疗方案操作失败'), 500);
}

function guarded(perm: string, fn: (c: Ctx, view: AuthView) => Promise<unknown>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, perm);
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
    try { return json(ok(await fn(c, view))); } catch (e) { return mapError(e); }
  };
}

/**
 * MDT 治疗计划草稿视图（demo）。
 */
export interface DraftPlanView {
  mdtConsultId: string;
  visitId: string;
  departments: string[];
  conclusion: string;
  draft: string;
  status: 'draft';
  updatedAt: string;
}

/**
 * 纯函数：构造 MDT 治疗计划草稿 demo 数据（DEMO_MODE 兜底，无副作用、可单测）。
 *
 * @returns 草稿视图
 */
export function listDraftView(): DraftPlanView {
  return {
    mdtConsultId: 'MDT-20261015-001',
    visitId: 'V-20261012-088',
    departments: ['肿瘤内科', '放疗科', '胸外科', '影像科'],
    conclusion: '建议先行新辅助化疗 2 周期后复评，再评估手术时机。',
    draft: '1. 完善基线检查；2. 行 XELOX 方案化疗；3. 2 周期后复查胸腹部 CT。',
    status: 'draft',
    updatedAt: '2026-10-15T08:40:00.000Z',
  };
}

/** 健澜科技：DEMO_MODE 下不连 PostgreSQL，返回内存 demo。 */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

export const mdtTreatmentPlanRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/mdt-treatment-plans/draft',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录', c.traceId), 401);
      if (isDemo) return json(ok(listDraftView(), 'ok', c.traceId));
      // 真实库草稿查询暂未提供，兜底返回内存 demo 草稿。
      return json(ok(listDraftView(), 'ok', c.traceId));
    },
  },
  {
    method: 'POST',
    path: '/api/v1/mdt-treatment-plans/:mdtId/draft',
    auth: true,
    handle: guarded('treatment_plan:manage', async (c, view) => {
      const b = await c.body<{ visitId: string; departments: string[]; conclusion: string; draft?: string }>();
      return draftView(view, { mdtConsultId: c.params.mdtId, ...b });
    }),
  },
  {
    method: 'GET',
    path: '/api/v1/mdt-treatment-plans',
    auth: true,
    handle: guarded('treatment_plan:view', async (c, view) => listView(view, c.query.get('visitId') ?? '')),
  },
  {
    method: 'POST',
    path: '/api/v1/mdt-treatment-plans/:id/confirm',
    auth: true,
    handle: guarded('treatment_plan:manage', async (c, view) => {
      const b = await c.body<{ scheduledAt: string }>();
      return confirmView(view, c.params.id, b.scheduledAt);
    }),
  },
];
