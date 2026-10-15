/**
 * 健澜科技 jlmedaios - 满意度评价 BFF 路由（M3-O）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode, requireRole } from '../middleware/auth';
import {
  SatisfactionError,
  submitMySurvey,
  submitSurveyByStaff,
  listMySurveys,
  listSurveysForStaff,
  getSurveyDetail,
  getSatisfactionStats,
  // M141-B 匿名满意度调查（患者敢说真话）
  analyzeSatisfaction,
  generateImprovementSuggestions,
  persistAnonymousSurvey,
  submitAnonymousSurvey,
} from '../aggregators/satisfactionAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof SatisfactionError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 409
          ? ErrorCode.CONFLICT
          : err.status === 403
            ? ErrorCode.FORBIDDEN
            : err.status === 400
              ? ErrorCode.BAD_REQUEST
              : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '满意度处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

function guarded<T>(permission: string, fn: (c: Ctx, view: AuthView) => Promise<T>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, permission);
    if (denied) return denied;
    const view = await requester(c);
    if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
    try {
      return json(ok(await fn(c, view)));
    } catch (err) {
      return mapError(err);
    }
  };
}

export const satisfactionRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/satisfaction/my',
    handle: guarded('satisfaction:submit', async (c, view) =>
      submitMySurvey(view, await c.body<Parameters<typeof submitMySurvey>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/satisfaction/staff',
    handle: guarded('satisfaction:submit', async (c, view) =>
      submitSurveyByStaff(view, await c.body<Parameters<typeof submitSurveyByStaff>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/satisfaction/my',
    handle: guarded('satisfaction:view', async (_c, view) => listMySurveys(view)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/satisfaction/list',
    handle: guarded('satisfaction:view', async (c) =>
      listSurveysForStaff({
        patientId: c.query.get('patientId') ?? undefined,
        sourceType:
          (c.query.get('sourceType') as 'outpatient' | 'inpatient' | 'consultation' | null) ??
          undefined,
      }),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/satisfaction/stats',
    handle: guarded('satisfaction:view', async (c) =>
      getSatisfactionStats(
        (c.query.get('sourceType') as 'outpatient' | 'inpatient' | 'consultation' | null) ??
          undefined,
      ),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/satisfaction/:id',
    handle: guarded('satisfaction:view', async (c) => getSurveyDetail(c.params.id)),
    auth: true,
  },

  /* ------------------------------------------------------------------ */
  /* M141-B · 匿名患者满意度调查（患者敢说真话）                            */
  /* ------------------------------------------------------------------ */

  // 【质量与安全】匿名提交：患者离院扫码填写，不登录、不记录 patient_id。
  // body: { visitId, deptCode?, scores: { registration_convenience: 1-5, ... }, comment? }
  {
    method: 'POST',
    path: '/api/v1/patient/survey/submit',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      let body: {
        visitId?: unknown;
        deptCode?: unknown;
        scores?: unknown;
        comment?: unknown;
      };
      try {
        body = await c.body<typeof body>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体必须为合法 JSON', c.traceId), 400);
      }
      if (typeof body.visitId !== 'string' || !body.visitId.trim()) {
        return json(fail(ErrorCode.BAD_REQUEST, 'visitId 不能为空', c.traceId), 400);
      }
      if (!body.scores || typeof body.scores !== 'object') {
        return json(fail(ErrorCode.BAD_REQUEST, 'scores 必须为对象', c.traceId), 400);
      }
      try {
        const record = submitAnonymousSurvey({
          visitId: body.visitId,
          deptCode: typeof body.deptCode === 'string' ? body.deptCode : undefined,
          scores: body.scores as Record<string, unknown>,
          comment: typeof body.comment === 'string' ? body.comment : undefined,
        });
        // best-effort 落库，失败不阻断匿名提交（患者敢说真话优先）
        await persistAnonymousSurvey(record);
        return json(ok({ submitted: true }, '感谢您的反馈，我们将持续改进'), 201);
      } catch (e) {
        return json(
          fail(ErrorCode.BAD_REQUEST, e instanceof Error ? e.message : '问卷提交失败', c.traceId),
          400,
        );
      }
    },
  },

  // 管理员满意度报告：?period=YYYY-MM&dept=xxx（dept 可选）
  {
    method: 'GET',
    path: '/api/v1/admin/satisfaction/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireRole(c, 'admin');
      if (denied) return denied;
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const period = c.query.get('period') || `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
      const dept = c.query.get('dept') || undefined;
      try {
        const analysis = analyzeSatisfaction(period, dept);
        const suggestions = generateImprovementSuggestions(analysis.lowScoreDimensions);
        return json(ok({ analysis, suggestions }, 'ok'));
      } catch (e) {
        return json(
          fail(ErrorCode.BAD_REQUEST, e instanceof Error ? e.message : '报告生成失败', c.traceId),
          400,
        );
      }
    },
  },
];
