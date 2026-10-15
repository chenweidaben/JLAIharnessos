/**
 * 健澜科技 jlmedaios - 用户操作手册路由（M132-B，产品化收尾）
 *
 * GET /api/v1/help/manual?role=doctor
 *  - role: doctor / nurse / pharmacist / admin / patient（未知回退 doctor）；
 *
 * 数据源：userManualAggregator 纯函数内容盘（不连 PostgreSQL、不抛业务错）。
 * 后续接入 CMS/知识库时，仅替换内容盘来源，getUserManual 签名不变。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { getUserManual, type Manual } from '../aggregators/userManualAggregator.js';

export const userManualRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/help/manual',
    handle: (c) => {
      try {
        const role = c.query.get('role') ?? undefined;

        // 纯函数组装（角色过滤已内置），空/未知角色安全回退 doctor
        const manual: Manual = getUserManual(role);

        return json(ok({ manual }, 'ok', c.traceId));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'user manual internal error';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
