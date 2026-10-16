/**
 * 健澜科技 jlmedaios - 医生移动工作站 BFF 路由（M158-B，v4.x近期）
 *
 * 独立移动端 H5/PWA 路由前缀 /api/v1/mobile/staff、/api/v1/mobile/push：
 *  - GET  /api/v1/mobile/staff/home      医生移动端首页（待办/患者/快捷/通知）
 *  - POST /api/v1/mobile/push/register  登记/续期设备推送令牌
 *
 * 医疗安全：
 *  - 首页为只读聚合，纯函数 buildMobileStaffHome 组装骨架，不写库；
 *  - 推送登记先经纯函数 registerPushToken 白名单校验，通过后仅返回 dedupKey，
 *    令牌落库（UPSERT clinical.mobile_session）由后续持久化层承接，本路由不
 *    触碰 WebSocket、不直接触达推送通道；
 *  - 权限码 mobile_staff:home / mobile_staff:push_register，见 permissions.ts。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  buildMobileStaffHome,
  registerPushToken,
  type MobileHome,
  type RegisterResult,
} from '../aggregators/mobileStaffAggregator.js';
import { MOBILE_STAFF_PERMISSIONS } from '../permissions';
import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';

/** 取登录用户主角色（取首个角色串；未匹配到则按 unknown 走降级首页）。 */
function primaryRole(c: Ctx): string {
  const roles = c.user?.roles;
  if (Array.isArray(roles) && roles.length > 0 && typeof roles[0] === 'string') {
    return roles[0];
  }
  return 'unknown';
}

/** 权限码守卫：缺失返回 403，否则进入 handler。 */
function guarded(permission: string, fn: (c: Ctx) => Promise<Response> | Response) {
  return async (c: Ctx): Promise<Response> => {
    const denied = requirePermissionCode(c, permission);
    if (denied) return denied;
    if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
    try {
      return await fn(c);
    } catch (err) {
      const message = err instanceof Error ? err.message : '移动端处理失败';
      return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
    }
  };
}

/* -------------------------------- 路由 --------------------------------- */

export const mobileStaffRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/mobile/staff/home',
    handle: guarded(MOBILE_STAFF_PERMISSIONS.HOME, (c) => {
      const home: MobileHome = buildMobileStaffHome(c.user!.id, primaryRole(c));
      return json(ok(home));
    }),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/mobile/push/register',
    handle: guarded(
      MOBILE_STAFF_PERMISSIONS.PUSH_REGISTER,
      async (c) => {
        const body = await c.body<{ deviceToken?: string; platform?: string }>();
        const result: RegisterResult = registerPushToken(
          c.user!.id,
          typeof body.deviceToken === 'string' ? body.deviceToken : '',
          typeof body.platform === 'string' ? body.platform : '',
        );
        if (result.status === 'rejected') {
          return json(fail(ErrorCode.BAD_REQUEST, result.reason ?? '推送令牌校验未通过'), 400);
        }
        // 仅回传稳定 dedupKey 与平台，不回显原始令牌（避免日志/响应泄漏）
        return json(
          ok({
            staffId: result.staffId,
            platform: result.platform,
            status: result.status,
            dedupKey: result.dedupKey,
          }),
        );
      },
    ),
    auth: true,
  },
];
