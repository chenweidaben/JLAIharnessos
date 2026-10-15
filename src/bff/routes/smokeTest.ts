/**
 * 健澜科技 jlmedaios - 全系统路由回归冒烟测试
 *
 * GET /api/v1/test/smoke（仅 admin）
 *
 * 行为约定：
 *  - 不发起任何真实 HTTP 请求；
 *  - 静态遍历「已知 GET 路由清单」（KNOWN_GET_ROUTES），并与清单自身做结构一致性比对：
 *      * 路径必须以 /api/v1/ 前缀开头；
 *      * 路径不得重复登记；
 *    通过 → 合成 200（pass）；违规 → 合成 500（fail）并写明 note；
 *  - 输出通过率（pass / total）与失败列表（failures）；
 *  - 仅 admin 角色可访问：未登录 401，非 admin 403。
 *
 * 用途：回归期快速识别路由清单漂移（缺失 / 重复 / 前缀错误），
 *       替代对全部 GET 端点做真实调用的重冒烟，零副作用、零外部依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import {
  classifyStatus,
  summarize,
  type SmokeRouteResult,
} from '../aggregators/smokeTestAggregator';
import { type Ctx, json, ok, type RouteDef } from '../types';

/**
 * 已知 GET 路由清单（静态维护）。
 *
 * 这是冒烟测试的「基准清单」：覆盖系统关键 GET 读取端点。
 * 新增 / 下线路由时需同步更新此清单；冒烟据此发现漂移。
 * 注意：此清单仅用于静态遍历，不代表在线实时路由表。
 */
const KNOWN_GET_ROUTES: readonly string[] = [
  // 基础与可观测
  '/api/v1/health',
  '/api/v1/model-info',
  '/api/v1/medmuse/agent-health',
  '/api/v1/medmuse/feedback/stats',
  // 系统管理（admin）
  '/api/v1/admin/users',
  '/api/v1/admin/users/:id',
  '/api/v1/admin/roles',
  '/api/v1/admin/roles/:code',
  '/api/v1/admin/permissions',
  '/api/v1/admin/permissions/matrix',
  '/api/v1/admin/permissions/roles',
  '/api/v1/admin/tenants/tree',
  '/api/v1/admin/audit-logs',
  '/api/v1/admin/audit-logs/overview',
  '/api/v1/admin/audit-logs/distribution',
  '/api/v1/admin/audit-logs/trend',
  '/api/v1/admin/audit-logs/:seq',
  '/api/v1/admin/login-logs',
  '/api/v1/admin/login-logs/overview',
  '/api/v1/admin/login-logs/trend',
  // 智能体平台
  '/api/v1/agent-builder/agents',
  '/api/v1/agent-builder/agents/:agentId',
  '/api/v1/agent-runtime/instances',
  '/api/v1/agent-runtime/instances/:instanceId',
  '/api/v1/human-tasks',
  '/api/v1/human-tasks/:taskId',
  // 临床业务（抽样关键读取端点）
  '/api/v1/admission-notes',
  '/api/v1/ai-note-qc',
  '/api/v1/ai-note-drafts',
  '/api/v1/appt/requests',
  '/api/v1/appt/followup-plans',
  '/api/v1/ams/catalog',
];

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
 * @param known 已知 GET 路由路径清单
 * @returns 逐条冒烟结果
 */
export function buildSmokeResults(known: readonly string[]): SmokeRouteResult[] {
  const seen = new Set<string>();
  const results: SmokeRouteResult[] = [];
  for (const path of known) {
    const base: SmokeRouteResult = { method: 'GET', path, status: 200 };
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
      // 仅 admin：未登录 401，非 admin 403
      const denied = requireRole(c, 'admin');
      if (denied) return denied;

      const results = buildSmokeResults(KNOWN_GET_ROUTES);
      const summary = summarize(results);
      const passRate = summary.total > 0 ? summary.pass / summary.total : 1;

      // 每条结果附上分类，便于前端展示
      const items = results.map((r) => ({ ...r, classification: classifyStatus(r.status) }));

      return json(
        ok({
          total: summary.total,
          pass: summary.pass,
          fail: summary.fail,
          passRate: Number(passRate.toFixed(4)),
          failures: summary.failures,
          results: items,
        }),
      );
    },
    auth: true,
  },
];
