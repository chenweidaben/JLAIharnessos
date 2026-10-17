/**
 * 健澜科技 jlmedaios - 性能与容量压测 V5 路由（M286-C）
 *
 * POST /api/v1/ops-perf（提交压测任务）
 * GET  /api/v1/ops-perf（结果列表）
 * GET  /api/v1/ops-perf/capacity（容量建议）
 *
 * 权限：ops-perf:read / ops-perf:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  analyzePerfV5,
  buildOpsPerfV5Report,
  designLoadV5,
  estimateCapacityV5,
  type PerfRun,
} from "../aggregators/opsPerfV5Aggregator.js";

const runStore: PerfRun[] = [];

export const opsPerfV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ops-perf",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ops-perf:read");
      if (denied) return denied;

      return json(ok({
        runs: runStore,
        analysis: analyzePerfV5(runStore),
      }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/ops-perf",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ops-perf:write");
      if (denied) return denied;

      const body = await c.req.json() as PerfRun & { baseline: number; peak: number };
      const run: PerfRun = {
        scenario: body.scenario,
        vusers: body.vusers,
        durationSec: body.durationSec,
        p95Ms: body.p95Ms,
        p99Ms: body.p99Ms,
        throughput: body.throughput,
        errorRate: body.errorRate,
      };
      runStore.push(run);
      return json(ok({
        run,
        loadPlan: designLoadV5(body.baseline, body.peak),
      }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/ops-perf/capacity",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ops-perf:read");
      if (denied) return denied;

      const totalThroughput = runStore.reduce((s, r) => s + r.throughput, 0);
      return json(ok({
        totalThroughput,
        ...estimateCapacityV5(totalThroughput, 0.3),
        report: buildOpsPerfV5Report(runStore, 0.3),
      }));
    },
  },
];
