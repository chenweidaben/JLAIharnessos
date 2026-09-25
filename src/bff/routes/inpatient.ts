/**
 * 健澜科技 jlmedaios - 住院工作台 BFF 路由（M1-A）
 *
 * 覆盖住院核心事务 ADT：
 *  - 读：床位图、在院患者列表、在院患者详情（含移动史）；
 *  - 写：入院登记（分配床位）、换床、转科、出院（释放床位）、床位状态维护。
 *
 * 严谨性：
 *  - 每条写操作先经业务权限码（inpatient:*）校验，再由聚合器按 DataScope 收敛；
 *  - 操作者为真实登录医护（JWT sub=iam UUID），AI 无法触达这些写端点；
 *  - 业务变更与审计在同一事务提交。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import {
  type Ctx,
  ErrorCode,
  fail,
  json,
  ok,
  type RouteDef,
} from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { INPATIENT_PERMISSIONS } from '../permissions';
import { BedAllocationError } from '@/db/repositories/bedRepo';
import {
  admit,
  changeBed,
  changeBedMaintenance,
  discharge,
  getBedMap,
  getInpatientDetail,
  InpatientError,
  listInpatients,
  transfer,
  type AdmitInput,
} from '../aggregators/inpatientAggregator';

/** 解析登录用户完整视图（含科室/数据范围/权限） */
async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

/** 统一把聚合器异常映射为 HTTP 响应 */
function mapError(err: unknown): Response {
  if (err instanceof InpatientError) {
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
  if (err instanceof BedAllocationError) {
    return json(fail(ErrorCode.CONFLICT, err.message), 409);
  }
  const message = err instanceof Error ? err.message : '住院事务处理失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

/** 包装处理：鉴权视图 + 权限码 + 异常映射 */
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
      // fn 内部手动校验可能已构造完整 Response（如 json(fail(...),400)），
      // 此时必须直接返回，不能再经默认 render 包成 ok()——否则错误被吞、误返 200 空数据。
      if (data instanceof Response) return data;
      return render(data);
    } catch (err) {
      return mapError(err);
    }
  };
}

/* ------------------------------ 路由 -------------------------------- */

export const inpatientRoutes: RouteDef[] = [
  // 床位图
  {
    method: 'GET',
    path: '/api/v1/inpatient/bed-map',
    handle: guarded(
      INPATIENT_PERMISSIONS.VIEW,
      (c, view) =>
        getBedMap(view, {
          campusCode: c.query.get('campusCode') ?? undefined,
          department: c.query.get('department') ?? undefined,
          wardId: c.query.get('wardId') ?? undefined,
        }),
    ),
    auth: true,
  },

  // 在院患者列表
  {
    method: 'GET',
    path: '/api/v1/inpatient/patients',
    handle: guarded(
      INPATIENT_PERMISSIONS.VIEW,
      (c, view) =>
        listInpatients(view, {
          campusCode: c.query.get('campusCode') ?? undefined,
          department: c.query.get('department') ?? undefined,
          wardId: c.query.get('wardId') ?? undefined,
        }),
    ),
    auth: true,
  },

  // 在院患者详情（含移动史）
  {
    method: 'GET',
    path: '/api/v1/inpatient/patients/:visitId',
    handle: guarded(INPATIENT_PERMISSIONS.VIEW, (c, view) =>
      getInpatientDetail(view, c.params.visitId),
    ),
    auth: true,
  },

  // 入院登记（自动/指定分配床位）
  {
    method: 'POST',
    path: '/api/v1/inpatient/admissions',
    handle: guarded(INPATIENT_PERMISSIONS.ADMIT, async (c, view) => {
      const body = await c.body<AdmitInput>();
      return admit(view, body);
    }),
    auth: true,
  },

  // 换床（同病区）
  {
    method: 'POST',
    path: '/api/v1/inpatient/patients/:visitId/bed-change',
    handle: guarded(INPATIENT_PERMISSIONS.MANAGE, async (c, view) => {
      const body = await c.body<{ targetBedId?: string; reason?: string }>();
      if (!body.targetBedId) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少目标床位 targetBedId'), 400);
      }
      return changeBed(view, {
        visitId: c.params.visitId,
        targetBedId: body.targetBedId,
        reason: body.reason,
      });
    }),
    auth: true,
  },

  // 转科
  {
    method: 'POST',
    path: '/api/v1/inpatient/patients/:visitId/transfer',
    handle: guarded(INPATIENT_PERMISSIONS.MANAGE, async (c, view) => {
      const body = await c.body<{ targetWardId?: string; targetBedId?: string; reason?: string }>();
      if (!body.targetWardId) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少目标病区 targetWardId'), 400);
      }
      return transfer(view, {
        visitId: c.params.visitId,
        targetWardId: body.targetWardId,
        targetBedId: body.targetBedId,
        reason: body.reason,
      });
    }),
    auth: true,
  },

  // 出院（释放床位）
  {
    method: 'POST',
    path: '/api/v1/inpatient/patients/:visitId/discharge',
    handle: guarded(INPATIENT_PERMISSIONS.DISCHARGE, async (c, view) => {
      const body = await c.body<{ reason?: string }>();
      return discharge(view, { visitId: c.params.visitId, reason: body.reason });
    }),
    auth: true,
  },

  // 床位状态维护（空闲/维护/隔离）
  {
    method: 'POST',
    path: '/api/v1/inpatient/beds/:bedId/status',
    handle: guarded(INPATIENT_PERMISSIONS.BED_MANAGE, async (c, view) => {
      const body = await c.body<{
        status?: 'available' | 'maintenance' | 'isolation';
        reason?: string;
      }>();
      if (!body.status || !['available', 'maintenance', 'isolation'].includes(body.status)) {
        return json(fail(ErrorCode.BAD_REQUEST, '状态无效（available/maintenance/isolation）'), 400);
      }
      return changeBedMaintenance(view, {
        bedId: c.params.bedId,
        status: body.status,
        reason: body.reason,
      });
    }),
    auth: true,
  },
];
