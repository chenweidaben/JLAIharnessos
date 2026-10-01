/**
 * 健澜科技 jlmedaios - 双向转诊 BFF 路由（M3-R）
 *
 * 真实落 PostgreSQL，去 mock：
 *  - 转诊队列 / 转诊详情（含随附资料）；
 *  - 发起登记、随附资料获取与存储；
 *  - 接收（院外患者 EMPI 建档 + 生成本院就诊）、拒绝、完成、取消。
 *
 * 对标国家医院智慧服务三级基本项目【3 转诊服务】。
 * 严谨性：状态机白名单 + 行锁；业务变更与审计哈希链同事务；统一错误信封。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import type { ReferralOrder } from '@/db/repositories/referralRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  ReferralError,
  acceptReferral,
  addDocument,
  cancelReferral,
  completeReferral,
  createReferral,
  getReferral,
  listReferralQueue,
  rejectReferral,
} from '../aggregators/referralAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown, c: Ctx): Response {
  if (err instanceof ReferralError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 403
          ? ErrorCode.FORBIDDEN
          : err.status === 409
            ? ErrorCode.CONFLICT
            : ErrorCode.BAD_REQUEST;
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

export const referralRoutes: RouteDef[] = [
  // ----- 发起转诊 -----
  {
    method: 'POST',
    path: '/api/v1/referrals',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'referral:manage');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        const body = await c.body<Parameters<typeof createReferral>[1]>();
        return json(ok(await createReferral(view, body)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 转诊列表 -----
  {
    method: 'GET',
    path: '/api/v1/referrals',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'referral:view');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        const direction = c.query.get('direction') as 'incoming' | 'outgoing' | null;
        const status = c.query.get('status') as ReferralOrder['status'] | null;
        return json(
          ok(
            await listReferralQueue(view, {
              direction: direction ?? undefined,
              status: status ?? undefined,
            }),
          ),
        );
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 转诊详情 -----
  {
    method: 'GET',
    path: '/api/v1/referrals/:id',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'referral:view');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        return json(ok(await getReferral(view, c.params.id)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 补充随附资料 -----
  {
    method: 'POST',
    path: '/api/v1/referrals/:id/documents',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'referral:manage');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        const body = await c.body<Omit<Parameters<typeof addDocument>[2], 'docType'> & {
          docType: Parameters<typeof addDocument>[2]['docType'];
        }>();
        return json(ok(await addDocument(view, c.params.id, body)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 接收转诊 -----
  {
    method: 'POST',
    path: '/api/v1/referrals/:id/accept',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'referral:accept');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        const body = await c.body<Parameters<typeof acceptReferral>[2]>();
        return json(ok(await acceptReferral(view, c.params.id, body)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 拒绝转诊 -----
  {
    method: 'POST',
    path: '/api/v1/referrals/:id/reject',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'referral:accept');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        const body = await c.body<{ reason: string }>();
        return json(ok(await rejectReferral(view, c.params.id, body.reason)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 完成转诊 -----
  {
    method: 'POST',
    path: '/api/v1/referrals/:id/complete',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'referral:accept');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        return json(ok(await completeReferral(view, c.params.id)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 取消转诊 -----
  {
    method: 'POST',
    path: '/api/v1/referrals/:id/cancel',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'referral:manage');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在', c.traceId), 401);
      try {
        return json(ok(await cancelReferral(view, c.params.id)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
];
