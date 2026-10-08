/**
 * 健澜科技 jlmedaios - 移动护理 PDA 执行端 BFF 路由（M16-A）
 *
 * 独立移动 H5 / PWA 路由前缀 /api/v1/m/*，全部 gate mobile_nursing:execute：
 *  - GET  /m/bed-board              床位看板（待办数 + 风险标记）；
 *  - POST /m/scan                   腕带/标本/药品扫码解析；
 *  - POST /m/orders/:id/verify      五重核对 dry-run；
 *  - POST /m/orders/:id/administer  五重核对通过后给药（不通过 409 回 mismatches）；
 *  - POST /m/vitals                 床旁体征采集；
 *  - POST /m/tasks/:id/execute      床旁执行护理任务；
 *  - POST /m/assessments            评估量表（Braden/Morse/Barthel/疼痛/营养）；
 *  - POST /m/records                床旁护理记录（模板 + 语音，AI 辅助）；
 *  - GET  /m/sbar                   SBAR 交班草稿；
 *  - POST /m/sbar/sign              SBAR 交班落库并本人签名。
 *
 * 医疗安全：所有写操作经护士本人；给药五重核对不通过即 409；高风险药双人核对；
 * AI 不自主开医嘱/护理措施。统一信封 + traceId，异常映射见 mapError。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { MOBILE_NURSING_PERMISSIONS } from '../permissions';
import { CareError } from '../aggregators/inpatientCareAggregator.js';
import {
  MobileVerifyError,
  buildSbar,
  captureVitals,
  createBedsideRecord,
  executeBedsideTask,
  getBedBoard,
  saveAssessment,
  scanAndAdminister,
  scanCode,
  signSbar,
  verifyMedication,
} from '../aggregators/mobileNursingAggregator.js';

/** 解析登录用户完整视图（含科室/数据范围/权限）。 */
async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

/** 聚合器异常 -> HTTP 响应；MobileVerifyError 携带结构化 mismatches。 */
function mapError(err: unknown): Response {
  if (err instanceof MobileVerifyError) {
    return json(
      {
        code: ErrorCode.CONFLICT,
        message: err.message,
        data: { mismatches: err.checks.mismatches, checks: err.checks },
        timestamp: new Date().toISOString(),
      },
      409,
    );
  }
  if (err instanceof CareError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 403
          ? ErrorCode.FORBIDDEN
          : err.status === 409
            ? ErrorCode.CONFLICT
            : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '移动护理处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

/** 包装处理：权限码 + 鉴权视图 + 异常映射。 */
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

/* -------------------------------- 路由 --------------------------------- */

export const mobileNursingRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/m/bed-board',
    handle: guarded(MOBILE_NURSING_PERMISSIONS.EXECUTE, async (c, view) => {
      const dept = c.query.get('dept');
      return getBedBoard(view, dept);
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/m/scan',
    handle: guarded(MOBILE_NURSING_PERMISSIONS.EXECUTE, async (c, view) => {
      const body = await c.body<{ code?: string; visitId?: string | null }>();
      if (!body.code?.trim()) return json(fail(ErrorCode.BAD_REQUEST, '缺少扫码 code'), 400);
      return scanCode(view, body.code, body.visitId ?? null);
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/m/orders/:id/verify',
    handle: guarded(MOBILE_NURSING_PERMISSIONS.EXECUTE, async (c, view) =>
      verifyMedication(view, c.params.id, await c.body()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/m/orders/:id/administer',
    handle: guarded(MOBILE_NURSING_PERMISSIONS.EXECUTE, async (c, view) =>
      scanAndAdminister(view, c.params.id, await c.body()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/m/vitals',
    handle: guarded(MOBILE_NURSING_PERMISSIONS.EXECUTE, async (c, view) =>
      captureVitals(view, await c.body()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/m/tasks/:id/execute',
    handle: guarded(MOBILE_NURSING_PERMISSIONS.EXECUTE, async (c, view) => {
      const body = await c.body<{ result?: string }>();
      return executeBedsideTask(view, c.params.id, body.result);
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/m/assessments',
    handle: guarded(MOBILE_NURSING_PERMISSIONS.EXECUTE, async (c, view) =>
      saveAssessment(view, await c.body()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/m/records',
    handle: guarded(MOBILE_NURSING_PERMISSIONS.EXECUTE, async (c, view) =>
      createBedsideRecord(view, await c.body()),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/m/sbar',
    handle: guarded(MOBILE_NURSING_PERMISSIONS.EXECUTE, async (c, view) => {
      const shift = c.query.get('shift') === 'night' ? 'night' : 'day';
      const dept = c.query.get('dept');
      return buildSbar(view, { dept, shift });
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/m/sbar/sign',
    handle: guarded(MOBILE_NURSING_PERMISSIONS.EXECUTE, async (c, view) =>
      signSbar(view, await c.body()),
    ),
    auth: true,
  },
];
