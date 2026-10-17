/**
 * 健澜科技 jlmedaios - 药师 MUSE 工作台 V5 路由（M283-C）
 *
 * GET  /api/v1/muse-pharmacist（工作台）
 * GET  /api/v1/muse-pharmacist/queue（审方队列）
 * POST /api/v1/muse-pharmacist/review（审方结论）
 *
 * 权限：muse-pharmacist:read / muse-pharmacist:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPharmacistDailyV5,
  flagInteractionV5,
  prioritizeReviewV5,
  type Prescription,
} from "../aggregators/musePharmacistV5Aggregator.js";

const queueStore: Prescription[] = [
  { rxId: "rx-001", patientId: "p1", drugs: ["华法林", "阿司匹林"], urgency: 5, isPediatric: false, isElderly: true },
  { rxId: "rx-002", patientId: "p2", drugs: ["阿莫西林"], urgency: 3, isPediatric: true, isElderly: false },
  { rxId: "rx-003", patientId: "p3", drugs: ["二甲双胍"], urgency: 1, isPediatric: false, isElderly: false },
];

export const musePharmacistV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/muse-pharmacist",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-pharmacist:read");
      if (denied) return denied;

      const pharmId = c.query.get("pharmId") ?? "pharm-001";
      return json(ok(buildPharmacistDailyV5(pharmId, queueStore)));
    },
  },
  {
    method: "GET",
    path: "/api/v1/muse-pharmacist/queue",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-pharmacist:read");
      if (denied) return denied;

      return json(ok(prioritizeReviewV5(queueStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/muse-pharmacist/review",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-pharmacist:write");
      if (denied) return denied;

      const body = await c.req.json() as { rxId: string; approved: boolean; note: string };
      const rx = queueStore.find((r) => r.rxId === body.rxId);
      const flag = rx ? flagInteractionV5(rx) : null;
      return json(ok({ reviewed: true, ...body, interactionFlag: flag }));
    },
  },
];
