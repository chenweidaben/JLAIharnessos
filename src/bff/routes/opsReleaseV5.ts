/**
 * 健澜科技 jlmedaios - 灰度发布与回滚 V5 路由（M286-B）
 *
 * POST /api/v1/ops-release（创建部署）
 * POST /api/v1/ops-release/:id/canary（放量）
 * POST /api/v1/ops-release/:id/rollback（回滚）
 * GET  /api/v1/ops-release（列表）
 *
 * 权限：ops-release:read / ops-release:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildOpsReleaseV5Report,
  planCanaryV5,
  rollbackPlanV5,
  routeCohortV5,
  type ReleaseDeploy,
} from "../aggregators/opsReleaseV5Aggregator.js";

const deployStore: ReleaseDeploy[] = [];

export const opsReleaseV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ops-release",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ops-release:read");
      if (denied) return denied;

      return json(ok({
        deploys: deployStore,
        report: buildOpsReleaseV5Report(deployStore),
      }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/ops-release",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ops-release:write");
      if (denied) return denied;

      const body = await c.req.json() as { version: string; strategy: "canary" | "blue-green" | "rolling"; canaryPct: number };
      const deploy: ReleaseDeploy = {
        id: `dep-${deployStore.length + 1}`,
        version: body.version,
        strategy: body.strategy,
        canaryPct: body.canaryPct,
        status: "pending",
      };
      deployStore.push(deploy);
      return json(ok({
        deploy,
        plan: planCanaryV5(body.version, body.canaryPct),
      }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/ops-release/:id/canary",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ops-release:write");
      if (denied) return denied;

      const deployId = (c.params.id ?? "").trim();
      const body = await c.req.json() as { pct: number; users: string[] };
      const idx = deployStore.findIndex((d) => d.id === deployId);
      if (idx < 0) {
        return json(ok({ found: false }));
      }
      deployStore[idx].canaryPct = body.pct;
      deployStore[idx].status = body.pct >= 100 ? "full" : "routing";
      return json(ok({
        deploy: deployStore[idx],
        routing: routeCohortV5(body.users, body.pct),
      }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/ops-release/:id/rollback",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ops-release:write");
      if (denied) return denied;

      const deployId = (c.params.id ?? "").trim();
      const body = await c.req.json() as { severity: "low" | "medium" | "high"; affectedUsers: number };
      const idx = deployStore.findIndex((d) => d.id === deployId);
      if (idx < 0) {
        return json(ok({ found: false }));
      }
      deployStore[idx].status = "rolled-back";
      return json(ok({
        deploy: deployStore[idx],
        plan: rollbackPlanV5(body),
      }));
    },
  },
];
