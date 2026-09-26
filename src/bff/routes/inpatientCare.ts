/**
 * 健澜科技 jlmedaios - 住院在院诊疗日常 BFF 路由（M1-B2）
 *
 * 真实落 PostgreSQL，去 mock。覆盖：
 *  - 医生查房：查房记录创建、本人签名、上级审签/退回；
 *  - 护士护理：护理记录单创建/本人签名、护理任务创建/执行；
 *  - 在院医嘱：开具、审核/驳回（医师）、执行/双人核对（护士）、停止（医师），
 *      以及长期/临时医嘱视图。
 *
 * 严谨性：
 *  - 每条写操作先经业务权限码校验，聚合器再按医护角色强制（职责分离）；
 *  - 护士审签查房 / 审核医嘱 / 停止医嘱 → 403；医师执行护理任务 / 医嘱给药 → 403；
 *  - 业务变更与审计哈希链在同一事务提交。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { INPATIENT_CARE_PERMISSIONS, INPATIENT_PERMISSIONS } from '../permissions';
import {
  CareError,
  administerInpatientOrder,
  countersignRound,
  createCareTask,
  createInpatientCareOrder,
  createNursingCareRecord,
  createRound,
  executeCareTask,
  getInpatientOrderView,
  listCareTasks,
  listNursingCareRecords,
  listRounds,
  rejectInpatientOrder,
  returnRound,
  reviewInpatientOrder,
  signNursingCareRecord,
  signRound,
  stopInpatientOrder,
} from '../aggregators/inpatientCareAggregator';

/** 解析登录用户完整视图（含科室/数据范围/权限）。 */
async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

/** 聚合器异常 → HTTP 响应。 */
function mapError(err: unknown): Response {
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
  const message = err instanceof Error ? err.message : '在院诊疗处理失败';
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

/** 从 query 取 visitId 并校验非空。 */
function requireVisitId(c: Ctx): string | Response {
  const visitId = c.query.get('visitId');
  if (!visitId) return json(fail(ErrorCode.BAD_REQUEST, '缺少 visitId'), 400);
  return visitId;
}

/* -------------------------------- 路由 --------------------------------- */

export const inpatientCareRoutes: RouteDef[] = [
  /* ------------------------------ 医生查房 ------------------------------ */
  {
    method: 'GET',
    path: '/api/v1/inpatient/rounds',
    handle: guarded(INPATIENT_PERMISSIONS.VIEW, async (c, view) => {
      const visitId = requireVisitId(c);
      if (visitId instanceof Response) return visitId;
      return listRounds(view, visitId);
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient/rounds',
    handle: guarded(INPATIENT_CARE_PERMISSIONS.ROUND_WRITE, async (c, view) =>
      createRound(view, await c.body()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient/rounds/:id/sign',
    handle: guarded(INPATIENT_CARE_PERMISSIONS.ROUND_WRITE, (c, view) =>
      signRound(view, c.params.id),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient/rounds/:id/countersign',
    handle: guarded(INPATIENT_CARE_PERMISSIONS.ROUND_COUNTERSIGN, (c, view) =>
      countersignRound(view, c.params.id),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient/rounds/:id/return',
    handle: guarded(INPATIENT_CARE_PERMISSIONS.ROUND_COUNTERSIGN, async (c, view) => {
      const body = await c.body<{ reason?: string }>();
      if (!body.reason?.trim()) {
        return json(fail(ErrorCode.BAD_REQUEST, '退回原因不能为空'), 400);
      }
      return returnRound(view, c.params.id, body.reason);
    }),
    auth: true,
  },

  /* ------------------------------ 护士护理 ------------------------------ */
  {
    method: 'GET',
    path: '/api/v1/inpatient/nursing/records',
    handle: guarded(INPATIENT_PERMISSIONS.VIEW, async (c, view) => {
      const visitId = requireVisitId(c);
      if (visitId instanceof Response) return visitId;
      return listNursingCareRecords(view, visitId);
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient/nursing/records',
    handle: guarded(INPATIENT_CARE_PERMISSIONS.NURSING_RECORD, async (c, view) =>
      createNursingCareRecord(view, await c.body()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient/nursing/records/:id/sign',
    handle: guarded(INPATIENT_CARE_PERMISSIONS.NURSING_RECORD, (c, view) =>
      signNursingCareRecord(view, c.params.id),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/inpatient/nursing/tasks',
    handle: guarded(INPATIENT_PERMISSIONS.VIEW, async (c, view) => {
      const visitId = requireVisitId(c);
      if (visitId instanceof Response) return visitId;
      return listCareTasks(view, visitId);
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient/nursing/tasks',
    handle: guarded(INPATIENT_CARE_PERMISSIONS.NURSING_TASK, async (c, view) =>
      createCareTask(view, await c.body()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient/nursing/tasks/:id/execute',
    handle: guarded(INPATIENT_CARE_PERMISSIONS.NURSING_TASK, async (c, view) => {
      const body = await c.body<{ result?: string }>();
      return executeCareTask(view, c.params.id, body.result);
    }),
    auth: true,
  },

  /* ------------------------------ 在院医嘱 ------------------------------ */
  {
    method: 'GET',
    path: '/api/v1/inpatient/orders',
    handle: guarded(INPATIENT_PERMISSIONS.VIEW, async (c, view) => {
      const visitId = requireVisitId(c);
      if (visitId instanceof Response) return visitId;
      return getInpatientOrderView(view, visitId);
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient/orders',
    handle: guarded(INPATIENT_CARE_PERMISSIONS.ORDER_WRITE, async (c, view) =>
      createInpatientCareOrder(view, await c.body()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient/orders/:id/review',
    handle: guarded(INPATIENT_CARE_PERMISSIONS.ORDER_REVIEW, (c, view) =>
      reviewInpatientOrder(view, c.params.id),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient/orders/:id/reject',
    handle: guarded(INPATIENT_CARE_PERMISSIONS.ORDER_REVIEW, async (c, view) => {
      const body = await c.body<{ reason?: string }>();
      if (!body.reason?.trim()) {
        return json(fail(ErrorCode.BAD_REQUEST, '驳回原因不能为空'), 400);
      }
      return rejectInpatientOrder(view, c.params.id, body.reason);
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient/orders/:id/administer',
    handle: guarded(INPATIENT_CARE_PERMISSIONS.ORDER_ADMINISTER, async (c, view) =>
      administerInpatientOrder(view, c.params.id, await c.body()),
    ),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/inpatient/orders/:id/stop',
    handle: guarded(INPATIENT_CARE_PERMISSIONS.ORDER_WRITE, (c, view) =>
      stopInpatientOrder(view, c.params.id),
    ),
    auth: true,
  },
];
