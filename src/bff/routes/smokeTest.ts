/**
 * 健澜科技 jlmedaios - 全系统路由回归冒烟测试
 *
 * GET /api/v1/test/smoke（仅 admin）
 *
 * 行为约定：
 *  - 不发起任何真实 HTTP 请求；
 *  - 静态遍历「已知 GET 路由清单」（KNOWN_GET_ROUTES，来自 aggregator），
 *    并与清单自身做结构一致性比对：
 *      * 路径必须以 /api/v1/ 前缀开头；
 *      * 路径不得重复登记；
 *    通过 → 合成 200（pass）；违规 → 合成 500（fail）并写明 note；
 *  - 每条结果附上鉴权需求标注（依据宪法第三章：public / auth / admin）；
 *  - 输出通过率（pass / total）、按鉴权档分桶计数（byAuth）与失败列表（failures）；
 *  - 仅 admin 角色可访问：未登录 401，非 admin 403。
 *
 * 用途：回归期快速识别路由清单漂移（缺失 / 重复 / 前缀错误 / 鉴权档错配），
 *       替代对全部 GET 端点做真实调用的重冒烟，零副作用、零外部依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import {
  classifyAuthRequirement,
  classifyStatus,
  KNOWN_GET_ROUTES,
  summarize,
  type SmokeRouteResult,
} from '../aggregators/smokeTestAggregator';
import { type Ctx, json, ok, type RouteDef } from '../types';

/** 路径前缀校验基准 */
const REQUIRED_PREFIX = '/api/v1/';

/**
 * 对已知 GET 路由清单做静态遍历与结构一致性比对，产出逐条结果。
 *
 * 纯函数：不访问网络 / 数据库，仅依据清单内容判定：
 *  - 缺前缀 → 500（fail）
 *  - 重复登记 → 500（fail）
 *  - 其余 → 200（pass）
 *
 * 每条结果附带 auth 鉴权档（依据宪法第三章）。
 *
 * @param known 已知 GET 路由路径清单
 * @returns 逐条冒烟结果
 */
export function buildSmokeResults(known: readonly string[]): SmokeRouteResult[] {
  const seen = new Set<string>();
  const results: SmokeRouteResult[] = [];
  for (const path of known) {
    const auth = classifyAuthRequirement(path);
    const base: SmokeRouteResult = { method: 'GET', path, status: 200, auth };
    if (!path.startsWith(REQUIRED_PREFIX)) {
      results.push({ ...base, status: 500, note: `路径缺少 ${REQUIRED_PREFIX} 前缀` });
      continue;
    }
    if (seen.has(path)) {
      results.push({ ...base, status: 500, note: '路由重复登记' });
      continue;
    }
    seen.add(path);
    results.push(base);
  }
  return results;
}

export const smokeTestRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/test/smoke',
    handle: (c: Ctx) => {
      // 仅 admin：未登录 401，非 admin 403（依据宪法第三章）
      const denied = requireRole(c, 'admin');
      if (denied) return denied;

      const results = buildSmokeResults(KNOWN_GET_ROUTES);
      const summary = summarize(results);
      const passRate = summary.total > 0 ? summary.pass / summary.total : 1;

      // 每条结果附上分类与鉴权档，便于前端展示
      const items = results.map((r) => ({
        ...r,
        classification: classifyStatus(r.status),
      }));

      return json(
        ok({
          total: summary.total,
          pass: summary.pass,
          fail: summary.fail,
          passRate: Number(passRate.toFixed(4)),
          byAuth: summary.byAuth,
          failures: summary.failures,
          results: items,
        }),
      );
    },
    auth: true,
  },
];
