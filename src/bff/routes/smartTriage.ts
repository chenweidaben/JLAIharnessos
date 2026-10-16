/**
 * 健澜科技 jlmedaios - 智能导诊/预问诊 BFF 路由（M3-P）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode, requireRole } from '../middleware/auth';
import {
  SmartTriageError,
  startTriage,
  chooseDepartment,
  submitPreliminary,
  listMyTriage,
  listPreliminaryForStaff,
  getPreliminaryDetail,
  consumePreliminary,
  // M164-C：【数据中台与AI大脑】智能导诊与健康管理纯函数
  buildSmartTriage,
  buildPatientHealthJourney,
  predictPatientNeeds,
} from '../aggregators/smartTriageAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown, c: Ctx): Response {
  if (err instanceof SmartTriageError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 403
          ? ErrorCode.FORBIDDEN
          : err.status === 400
            ? ErrorCode.BAD_REQUEST
            : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message, c.traceId), err.status);
  }
  // 非业务错误（如 DB 连接失败）：服务端记录完整错误（含 traceId），
  // 客户端仅返回通用文案 + traceId，不泄露堆栈/SQL/连接细节（等保三级）。
  console.error(`[bff error] ${c.req.method} ${c.req.url} [${c.traceId}]`, err);
  return json(
    fail(ErrorCode.INTERNAL_ERROR, '服务器内部错误，请联系管理员', c.traceId),
    500,
  );
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
      return mapError(err, c);
    }
  };
}

/**
 * 患者端守卫：患者 JWT（roles=['patient']），仅需 accountId。
 * 患者账号在 patient_accounts 表，不在 iam.users，故不查 userRepo。
 */
function patientGuarded<T>(fn: (c: Ctx, view: AuthView) => Promise<T>) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requireRole(c, 'patient');
    if (denied) return denied;
    const view = { id: c.user!.id } as AuthView;
    try {
      return json(ok(await fn(c, view)));
    } catch (err) {
      return mapError(err, c);
    }
  };
}

export const smartTriageRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/triage/start',
    handle: patientGuarded(async (c, view) =>
      startTriage(view, await c.body<Parameters<typeof startTriage>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/triage/choose',
    handle: patientGuarded(async (c, view) =>
      chooseDepartment(view, await c.body<Parameters<typeof chooseDepartment>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/triage/preliminary',
    handle: patientGuarded(async (c, view) =>
      submitPreliminary(view, await c.body<Parameters<typeof submitPreliminary>[1]>()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/triage/my',
    handle: patientGuarded(async (_c, view) => listMyTriage(view)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/triage/preliminary',
    handle: guarded('triage:view', async (c, view) =>
      listPreliminaryForStaff(view, {
        patientId: c.query.get('patientId') ?? undefined,
      }),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/triage/preliminary/:id',
    handle: guarded('triage:view', async (c, view) =>
      getPreliminaryDetail(view, c.params.id),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/triage/preliminary/:id/consume',
    handle: guarded('triage:view', async (c, view) =>
      consumePreliminary(view, c.params.id),
    ),
    auth: true,
  },
  // M164-C：【患者服务深化】智能导诊（红旗症状硬编码直急诊）——纯函数，免登录演示
  {
    method: 'GET',
    path: '/api/v1/patient/smart-triage',
    handle: (c: Ctx): Response => {
      const symptoms = c.query.get('symptoms') ?? '';
      if (!symptoms.trim()) {
        return json(
          fail(ErrorCode.BAD_REQUEST, '请描述您的症状', c.traceId),
          400,
        );
      }
      // duration / severity 由 query 透传为字符串，纯函数内部规范化
      const result = buildSmartTriage(
        symptoms,
        c.query.get('duration') ?? undefined,
        c.query.get('severity') ?? undefined,
      );
      return json(ok(result));
    },
    auth: false,
  },
  // M164-C：【患者服务深化】患者健康旅程 + AI大脑需求预测——纯函数，免登录演示
  {
    method: 'GET',
    path: '/api/v1/patient/health-journey/:patientId',
    handle: (c: Ctx): Response => {
      const patientId = c.params.patientId;
      const journey = buildPatientHealthJourney(patientId);
      const currentStage =
        journey.stages.find((s) => s.status === 'current')?.key ?? 'intake';
      const predictedNeeds = predictPatientNeeds(patientId, currentStage);
      return json(ok({ ...journey, predictedNeeds }));
    },
    auth: false,
  },
];
