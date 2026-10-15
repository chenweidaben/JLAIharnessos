/**
 * 健澜科技 jlmedaios - M135-A 全路由冒烟测试【生产就绪质量门禁】
 *
 * GET /api/v1/admin/test/smoke（仅 admin，依据宪法第三章）
 *
 * 行为约定：
 *  - 基于 aggregator 的 DEFAULT_ROUTE_INVENTORY（覆盖 admin / doctor / nurse /
 *    pharma / patient / public 六桶真实 GET 路径）执行纯函数冒烟编排；
 *  - 默认探针为 structuralProbe：零网络副作用，只做路由登记结构校验
 *    （前缀 / 重复 / 空路径），替代对全部端点发起真实调用的重冒烟；
 *  - 逐条记录：通过(绿) / 失败(红) / 响应时间(elapsedMs)；
 *  - 输出整份 SmokeReport：通过率、六桶分桶、平均 / 最大响应时间、失败明细；
 *  - 仅 admin 角色可访问：未登录 401，非 admin 403。
 *
 * 用途：发版 / 回归期快速识别路由清单漂移（缺失 / 重复 / 前缀错误），
 *       前端红绿报告页（web/src/pages/admin/test/Smoke）直读本接口。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import {
  classifyAuthRequirement,
  classifyStatus,
  DEFAULT_ROUTE_INVENTORY,
  generateSmokeReport,
  KNOWN_GET_ROUTES,
  smokeTestAllRoutes,
  summarize,
  type SmokeRouteResult,
} from '../aggregators/smokeTestAggregator';
import { type Ctx, json, ok, type RouteDef } from '../types';

/** 路径前缀校验基准（旧版静态比对沿用） */
const REQUIRED_PREFIX = '/api/v1/';

/**
 * 对已知 GET 路由清单做静态遍历与结构一致性比对，产出逐条结果。
 *
 * 纯函数：不访问网络 / 数据库，仅依据清单内容判定：
 *  - 缺前缀 → 500（fail）
 *  - 重复登记 → 500（fail）
 *  - 其余 → 200（pass）
 *
 * 保留为向后兼容导出（旧版 /api/v1/test/smoke 逻辑的单测引用）。
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

/**
 * 从请求中推导探针基准地址（用于报告中的 url 展示）。
 * Bun 运行时 c.req.url 为绝对地址；解析失败时回退本地默认值。
 */
function resolveBaseUrl(c: Ctx): string {
  try {
    return new URL(c.req.url).origin;
  } catch {
    return 'http://127.0.0.1';
  }
}

export const smokeTestRoutes: RouteDef[] = [
  {
    // M135-A 全路由冒烟：六桶红绿报告（仅 admin）
    method: 'GET',
    path: '/api/v1/admin/test/smoke',
    handle: (c: Ctx) => {
      // 仅 admin：未登录 401，非 admin 403（依据宪法第三章）
      const denied = requireRole(c, 'admin');
      if (denied) return denied;

      const baseUrl = resolveBaseUrl(c);
      // 纯函数编排：路由发现（DEFAULT_ROUTE_INVENTORY）→ 结果聚合 → 报告生成
      const results = smokeTestAllRoutes(DEFAULT_ROUTE_INVENTORY, baseUrl);
      const report = generateSmokeReport(results, { baseUrl });

      return json(ok(report));
    },
    auth: true,
  },
  {
    // 旧版静态清单比对（保留兼容）
    method: 'GET',
    path: '/api/v1/test/smoke',
    handle: (c: Ctx) => {
      const denied = requireRole(c, 'admin');
      if (denied) return denied;

      const results = buildSmokeResults(KNOWN_GET_ROUTES);
      const summary = summarize(results);
      const passRate = summary.total > 0 ? summary.pass / summary.total : 1;

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
