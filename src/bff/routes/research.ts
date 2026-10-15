/**
 * 健澜科技 jlmedaios - 科研专病队列 BFF 路由（M5-B）
 *
 * 真实落 PostgreSQL，去 mock：
 *  - 队列列表/详情（research:read）；
 *  - 创建/编辑（research:write）；
 *  - 发布/归档（research:write）；
 *  - 运行匹配（research:write）；
 *  - 成员/统计（research:read）；
 *  - 脱敏数据集导出（research:write）。
 *
 * 每个写操作校验权限码；统一错误信封；关键操作写审计哈希链。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  RESEARCH_STATUS_LABEL,
  ResearchError,
  archiveResearchCohort,
  createResearchCohort,
  exportCohortDataset,
  getCohortMembers,
  getResearchCohort,
  getResearchCohortStats,
  listResearchCohorts,
  publishResearchCohort,
  runCohortMatching,
  updateResearchCohort,
  // M140-B 科研项目管理（医院管理深化）：跟踪到结题闭环
  listResearchProjects,
  registerResearchProject,
  updateResearchProgress,
  type ResearchProjectStatus,
} from '../aggregators/researchAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof ResearchError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 403
          ? ErrorCode.FORBIDDEN
          : err.status === 409
            ? ErrorCode.CONFLICT
            : err.status === 400
              ? ErrorCode.BAD_REQUEST
              : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '科研队列处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

function guarded<T>(
  permission: string,
  fn: (c: Ctx, view: AuthView) => Promise<T>,
  render: (data: T) => Response = (d) => json(ok(d)),
) {
  return async (c: Ctx): Promise<Response> => {
    const deniedCode = requirePermissionCode(c, permission);
    if (deniedCode) return deniedCode;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try {
      const data = await fn(c, view);
      if (data instanceof Response) return data;
      return render(data);
    } catch (err) {
      return mapError(err);
    }
  };
}

export const researchRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/research/cohorts',
    handle: guarded('research:read', (c, view) =>
      listResearchCohorts(view, {
        status: c.query.get('status') ?? undefined,
      }),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/research/cohorts',
    handle: guarded('research:write', async (c, view) =>
      createResearchCohort(view, await c.body()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/research/cohorts/:id',
    handle: guarded('research:read', (c, view) => getResearchCohort(view, c.params.id)),
    auth: true,
  },
  {
    method: 'PUT',
    path: '/api/v1/research/cohorts/:id',
    handle: guarded('research:write', async (c, view) =>
      updateResearchCohort(view, c.params.id, await c.body()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/research/cohorts/:id/publish',
    handle: guarded('research:write', (c, view) =>
      publishResearchCohort(view, c.params.id),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/research/cohorts/:id/archive',
    handle: guarded('research:write', (c, view) =>
      archiveResearchCohort(view, c.params.id),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/research/cohorts/:id/run',
    handle: guarded('research:write', (c, view) =>
      runCohortMatching(view, c.params.id),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/research/cohorts/:id/members',
    handle: guarded('research:read', (c, view) =>
      getCohortMembers(view, c.params.id, {
        limit: Number(c.query.get('limit') ?? 100),
        offset: Number(c.query.get('offset') ?? 0),
      }),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/research/cohorts/:id/stats',
    handle: guarded('research:read', (c, view) =>
      getResearchCohortStats(view, c.params.id),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/research/cohorts/:id/export',
    handle: guarded('research:write', (c, view) =>
      exportCohortDataset(view, c.params.id),
    ),
    auth: true,
  },
  /* ==================== M140-B 科研项目管理（医院管理深化） ====================
   * 跟踪到结题：登记(申报中) -> 进度推进(进行中) -> progress=100(已结题)
   *            -> 里程碑含「验收」(已验收)，不能登记完就不管了。
   * ------------------------------------------------------------------ */
  {
    method: 'GET',
    path: '/api/v1/admin/research',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        const status = c.query.get('status') ?? undefined;
        const projects = listResearchProjects(
          status ? { status: status as ResearchProjectStatus } : undefined,
        );
        return json(ok({ projects, statusLabel: RESEARCH_STATUS_LABEL }));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '科研项目查询失败'),
          500,
        );
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/admin/research',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        const body = await c.body<{
          title?: string;
          leaderId?: string;
          dept?: string;
          funding?: number;
          startDate?: string;
          endDate?: string;
        }>();
        const project = registerResearchProject(
          body?.title ?? '',
          body?.leaderId ?? '',
          body?.dept ?? '',
          body?.funding ?? 0,
          body?.startDate ?? '',
          body?.endDate ?? '',
        );
        return json(ok({ project }, '项目登记成功'));
      } catch (e) {
        return json(
          fail(ErrorCode.BAD_REQUEST, e instanceof Error ? e.message : '项目登记失败'),
          400,
        );
      }
    },
  },
  {
    method: 'PUT',
    path: '/api/v1/admin/research/:id/progress',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        const body = await c.body<{ progress?: number; milestone?: string }>();
        const project = updateResearchProgress(
          c.params.id,
          body?.progress ?? -1,
          body?.milestone ?? '',
        );
        return json(ok({ project }, '进度已更新'));
      } catch (e) {
        const msg = e instanceof Error ? e.message : '进度更新失败';
        const notFound = msg.includes('不存在') || msg.includes('已验收');
        return json(
          fail(notFound ? ErrorCode.NOT_FOUND : ErrorCode.BAD_REQUEST, msg),
          notFound ? 404 : 400,
        );
      }
    },
  },
];
