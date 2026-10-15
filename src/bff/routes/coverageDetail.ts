/**
 * 健澜科技 jlmedaios - M151-A 覆盖率明细 BFF 路由（90%+ 冲刺·函数级缺口定位）
 *
 * 【质量补齐与新场景】
 *
 * GET /api/v1/admin/test/coverage/detailed（仅 admin，依据宪法第三章）
 *
 * 行为约定：
 *  - 调用纯函数 getDetailedCoverage() 生成逐文件行级明细，
 *    并对两个重点补测文件（securityBaselineAggregator / backupAggregator）
 *    做函数段钻取；
 *  - 可选 query 参数 threshold（如 0.9）：附带 verifyCoverageThreshold(threshold)
 *    的门禁校验结果 ThresholdResult；不传则默认 0.9；
 *  - 仅 admin 角色可访问：未登录 401，非 admin 403；
 *  - 不发起任何真实 HTTP / DB 请求，纯确定性运算。
 *
 * 用途：发版 / CI 期定位 90%+ 冲刺的剩余缺口（安全基线 120 行、备份恢复 110 行），
 *       前端明细页（web/src/pages/admin/test/CoverageDetail/index.tsx）直读本接口。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import {
  getDetailedCoverage,
  verifyCoverageThreshold,
} from '../aggregators/coverageDetailAggregator';
import { type Ctx, json, ok, type RouteDef } from '../types';

export const coverageDetailRoutes: RouteDef[] = [
  {
    // M151-A 覆盖率明细 + 阈值门禁校验（仅 admin，质量门禁）
    method: 'GET',
    path: '/api/v1/admin/test/coverage/detailed',
    handle: (c: Ctx) => {
      // 仅 admin：未登录 401，非 admin 403（依据宪法第三章）
      const denied = requireRole(c, 'admin');
      if (denied) return denied;

      // 可选 threshold 查询参数（非法 / 越界由纯函数 clamp）
      const rawThreshold = c.query.get('threshold');
      const threshold = rawThreshold === null ? 0.9 : Number(rawThreshold);

      // 纯函数编排：明细报告 + 阈值门禁校验
      const report = getDetailedCoverage({ targetThreshold: 0.9 });
      const verification = verifyCoverageThreshold(threshold, { report });

      return json(ok({ report, verification }));
    },
    auth: true,
  },
];
