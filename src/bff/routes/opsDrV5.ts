/**
 * 健澜科技 jlmedaios - 灾备与高可用 V5 路由（M286-D）
 *
 * GET  /api/v1/ops-dr（看板）
 * POST /api/v1/ops-dr/exercise（演练）
 * POST /api/v1/ops-dr/failover（切换）
 *
 * 权限：ops-dr:read / ops-dr:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  assessRPO_RTOV5,
  buildOpsDRV5Report,
  checkBackupV5,
  simulateFailoverV5,
  type DRPlan,
  type FailoverEvent,
} from "../aggregators/opsDrV5Aggregator.js";

const planStore: DRPlan[] = [
  { system: "HIS", rpoMinutes: 15, rtoMinutes: 60, backupFreqMinutes: 30, lastBackupAt: Date.now() - 10 * 60000, status: "healthy" },
  { system: "PACS", rpoMinutes: 60, rtoMinutes: 30, backupFreqMinutes: 120, lastBackupAt: Date.now() - 90 * 60000, status: "stale" },
];

const eventStore: FailoverEvent[] = [];

export const opsDrV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ops-dr",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ops-dr:read");
      if (denied) return denied;

      const now = Date.now();
      return json(ok({
        report: buildOpsDRV5Report(planStore, now),
        plans: planStore.map((p) => ({
          ...p,
          backupCheck: checkBackupV5(p, now),
        })),
      }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/ops-dr/exercise",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ops-dr:write");
      if (denied) return denied;

      const body = await c.req.json() as { system: string };
      const plan = planStore.find((p) => p.system === body.system);
      if (!plan) {
        return json(ok({ found: false }));
      }
      return json(ok({
        system: plan.system,
        simulation: simulateFailoverV5(plan),
        assess: assessRPO_RTOV5(plan, Math.round((Date.now() - plan.lastBackupAt) / 60000)),
      }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/ops-dr/failover",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ops-dr:write");
      if (denied) return denied;

      const body = await c.req.json() as { system: string; switchTo: string };
      const event: FailoverEvent = {
        system: body.system,
        triggeredAt: Date.now(),
        switchTo: body.switchTo,
      };
      eventStore.push(event);
      return json(ok({ event, totalFailovers: eventStore.length }));
    },
  },
];
