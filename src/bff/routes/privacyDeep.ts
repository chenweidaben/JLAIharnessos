/**
 * 健澜科技数智医院智能体（jlmedaios） - BFF 患者隐私深度脱敏路由（M155-B）
 *
 * 【质量与合规】
 *  - GET /api/v1/admin/privacy/compliance：仅 admin 可读，返回隐私合规自检报告；
 *  - 报告含总体结论、得分、四项检查明细（API 默认脱敏 / 日志不记敏感 /
 *    导出脱敏 / 权限最小化）与深度脱敏样例，供前端「隐私合规」页渲染；
 *  - 不接受外部写入（脱敏规则在代码内固化，变更需走代码评审与发版）；
 *  - 所有端点 requireRole('admin')，未登录 401、非管理员 403。
 *
 * 本文件导出 privacyDeepAdminRoutes，由 server.ts 统一接线。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { json, ok, type RouteDef } from '../types';
import { checkPrivacyCompliance } from '../aggregators/privacyDeepAggregator';

/* ------------------------------------------------------------------ */
/* 路由定义                                                             */
/* ------------------------------------------------------------------ */

export const privacyDeepAdminRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/privacy/compliance',
    handle: (c) => {
      // 【质量与合规】仅系统管理员可读取隐私合规报告
      const denied = requireRole(c, 'admin');
      if (denied) return denied;
      return json(ok(checkPrivacyCompliance()));
    },
    auth: true,
  },
];
