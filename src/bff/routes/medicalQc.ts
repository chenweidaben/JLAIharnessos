/**
 * 健澜科技 jlmedaios - 运行病历质控 BFF 路由（M2-B）
 *
 * 真实落 PostgreSQL，去 mock：
 *  - 质控队列 / 病历质控详情（含历史质控签名链）；
 *  - 质控检查：规则引擎（完整性/时限/缺陷）+ 可选 AI 辅助；
 *  - 质控结论：medical_record:audit，pass 逐级推进 / return 退回，质控人签名；
 *  - 整改重提：medical_record:write，仅作者本人。
 *
 * 严谨性：质控人不得为作者本人（聚合器强制）；AI 仅辅助、不产生最终结论；
 * 业务变更与审计哈希链在同一事务提交，统一错误信封。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  QcError,
  submitForQc,
  getQcQueue,
  getQcRecord,
  resubmitRecord,
  runQcCheck,
  submitQcReview,
} from '../aggregators/medicalQcAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof QcError) {
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
  const message = err instanceof Error ? err.message : '病历质控处理失败';
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

export const medicalQcRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/medical-qc/queue',
    handle: guarded('medical_record:read', (_c, view) => getQcQueue(view)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/medical-qc/records/:id',
    handle: guarded('medical_record:read', (c, view) => getQcRecord(view, c.params.id)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/medical-qc/records/:id/check',
    handle: guarded('medical_record:read', async (c, view) => {
      const body = await c.body<{ useAi?: boolean }>();
      return runQcCheck(view, c.params.id, body.useAi === true);
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/medical-qc/records/:id/review',
    handle: guarded('medical_record:audit', async (c, view) =>
      submitQcReview(view, c.params.id, await c.body()),
    ),
    auth: true,
  },

  {
    method: 'POST',
    path: '/api/v1/medical-qc/records/:id/submit',
    handle: guarded('medical_record:write', (c, view) => submitForQc(view, c.params.id)),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/medical-qc/records/:id/resubmit',
    handle: guarded('medical_record:write', (c, view) => resubmitRecord(view, c.params.id)),
    auth: true,
  },
];