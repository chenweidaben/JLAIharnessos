/**
 * 健澜科技数智医院智能体（jlmedaios） - BFF 脱敏配置管理路由（M123-B）
 *
 * 【生产安全加固】
 *  - GET /api/v1/admin/security/mask-config：仅 admin 可读；
 *  - 返回当前脱敏规则表、角色可见性策略与样例，供前端「脱敏配置」页面渲染；
 *  - 不接受外部写入（规则在代码内固化，变更需走代码评审与发版，避免运行时被篡改）；
 *  - 所有端点 requireRole('admin')，未登录 401、非管理员 403。
 *
 * 本文件导出 maskConfigAdminRoutes，由 server.ts 统一接线。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { json, ok, type RouteDef } from '../types';
import { getMaskConfigSnapshot } from '../aggregators/dataMaskingAggregator';

/* ------------------------------------------------------------------ */
/* 路由定义                                                              */
/* ------------------------------------------------------------------ */

export const maskConfigAdminRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/security/mask-config',
    handle: (c) => {
      // 【生产安全加固】仅系统管理员可读取脱敏配置
      const denied = requireRole(c, 'admin');
      if (denied) return denied;
      return json(ok(getMaskConfigSnapshot()));
    },
    auth: true,
  },
];
