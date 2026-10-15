/**
 * 健澜科技 jlmedaios - M128-B 医生移动端快捷操作 BFF 路由
 *
 * GET /api/v1/mobile/quick-actions
 *  - 登录后按当前用户主角色（医生/护士/药师）返回首页大按钮快捷操作；
 *  - 权限二次收敛：buildMobileQuickActions 已按用户权限码过滤，
 *    无权限的操作不下发，前端不渲染越权入口；
 *  - 纯只读、无写副作用、不暴露患者个体 PII。
 *
 * 移动端+性能优化：响应为小体量静态目录（个位数条目），前端可按角色长期缓存。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildMobileQuickActions,
  STAFF_ROLES,
} from '../aggregators/mobileQuickActionsAggregator';

/**
 * GET /api/v1/mobile/quick-actions
 * 移动端首页快捷操作（医生/护士/药师）。
 */
async function handleQuickActions(c: Ctx): Promise<Response> {
  // 仅医护角色（未登录 401、非医护角色 403）
  const denied = requireRole(c, ...STAFF_ROLES);
  if (denied) return denied;

  try {
    const roles = c.user?.roles ?? [];
    // 多角色时取第一个医护角色作为主角色（与登录态角色声明一致）。
    const primaryRole = roles.find((r) => (STAFF_ROLES as readonly string[]).includes(r)) ?? '';
    const permissions = c.user?.permissions ?? [];
    const actions = buildMobileQuickActions(primaryRole, permissions);
    return json(ok({ role: primaryRole, actions }));
  } catch (err) {
    const message = err instanceof Error ? err.message : '快捷操作加载失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const mobileQuickActionsRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/mobile/quick-actions',
    auth: true,
    handle: handleQuickActions,
  },
];
