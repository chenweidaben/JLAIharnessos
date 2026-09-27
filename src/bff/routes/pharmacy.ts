/**
 * 健澜科技 jlmedaios - 药房调剂发药 BFF 路由（M2-A）
 *
 * 真实落 PostgreSQL，去 mock。覆盖药师完整工作流：
 *  - 待审方队列 / 待发药队列；
 *  - 药师审方（pending_review → approved/rejected，哈希链留痕）；
 *  - 发药前 CDS 预览（过敏/相互作用/禁忌 block）；
 *  - 调剂发药（FEFO 批次原子扣库存 + 库存流水 + 幂等发药记录 + 处方置 dispensed）；
 *  - 发药记录、库存与库存流水查询；
 *  - CDS block 的 override：须由具备 cds:override 的医师授权并签名，药师不可单方强发。
 *
 * 严谨性：
 *  - 每条写操作先经业务权限码校验，聚合器再按角色强制（职责分离）；
 *  - 护士/医师发药、药师审方越权、无医师 override 强发 block 药 → 403；
 *  - 业务变更与审计哈希链在同一事务提交，统一错误信封。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { PHARMACY_PERMISSIONS } from '../permissions';
import {
  PharmacyError,
  dispensePrescription,
  getDispenseQueue,
  getDispensingRecords,
  getInventory,
  getInventoryMovements,
  getPrescriptionsForVisitView,
  getReviewQueue,
  previewDispenseCds,
  reviewPendingPrescription,
} from '../aggregators/pharmacyAggregator';

/** 解析登录用户完整视图（含科室/数据范围/权限）。 */
async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

/** 聚合器异常 → HTTP 响应（统一错误信封）。 */
function mapError(err: unknown): Response {
  if (err instanceof PharmacyError) {
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
  const message = err instanceof Error ? err.message : '药房调剂处理失败';
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

export const pharmacyRoutes: RouteDef[] = [
  /* ------------------------------ 队列 ------------------------------ */
  {
    method: 'GET',
    path: '/api/v1/pharmacy/queue/dispense',
    handle: guarded(PHARMACY_PERMISSIONS.VIEW, (_c, view) => getDispenseQueue(view)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/pharmacy/queue/review',
    handle: guarded(PHARMACY_PERMISSIONS.VIEW, (_c, view) => getReviewQueue(view)),
    auth: true,
  },

  /* --------------------------- 审方 / CDS --------------------------- */
  {
    method: 'POST',
    path: '/api/v1/pharmacy/prescriptions/:id/review',
    handle: guarded(PHARMACY_PERMISSIONS.REVIEW, async (c, view) => {
      const body = await c.body<{ decision: 'approved' | 'rejected'; comment?: string | null }>();
      return reviewPendingPrescription(view, c.params.id, body);
    }),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/pharmacy/prescriptions/:id/cds',
    handle: guarded(PHARMACY_PERMISSIONS.VIEW, (c, view) =>
      previewDispenseCds(view, c.params.id),
    ),
    auth: true,
  },

  /* ------------------------------ 发药 ------------------------------ */
  {
    method: 'POST',
    path: '/api/v1/pharmacy/prescriptions/:id/dispense',
    handle: guarded(PHARMACY_PERMISSIONS.DISPENSE, async (c, view) =>
      dispensePrescription(view, c.params.id, await c.body()),
    ),
    auth: true,
  },

  /* ---------------------------- 发药记录 ---------------------------- */
  {
    method: 'GET',
    path: '/api/v1/pharmacy/dispensings',
    handle: guarded(PHARMACY_PERMISSIONS.VIEW, (c, view) =>
      getDispensingRecords(view, {
        prescriptionId: c.query.get('prescriptionId') ?? undefined,
        warehouse: c.query.get('warehouse') ?? undefined,
      }),
    ),
    auth: true,
  },

  /* --------------------------- 库存 / 流水 --------------------------- */
  {
    method: 'GET',
    path: '/api/v1/pharmacy/inventory',
    handle: guarded(PHARMACY_PERMISSIONS.INVENTORY, (c, view) =>
      getInventory(view, {
        warehouse: c.query.get('warehouse') ?? undefined,
        keyword: c.query.get('keyword') ?? undefined,
      }),
    ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/pharmacy/inventory/movements',
    handle: guarded(PHARMACY_PERMISSIONS.INVENTORY, (c, view) =>
      getInventoryMovements(view, {
        drugId: c.query.get('drugId') ?? undefined,
        warehouse: c.query.get('warehouse') ?? undefined,
        reason: c.query.get('reason') ?? undefined,
      }),
    ),
    auth: true,
  },

  /* ------------------------ 按就诊查处方（定位） ------------------------ */
  {
    method: 'GET',
    path: '/api/v1/pharmacy/prescriptions',
    handle: guarded(PHARMACY_PERMISSIONS.VIEW, (c, view) => {
      const visitId = c.query.get('visitId');
      if (!visitId) {
        throw new PharmacyError(400, 'BAD_REQUEST', '缺少 visitId');
      }
      return getPrescriptionsForVisitView(view, visitId);
    }),
    auth: true,
  },
];
