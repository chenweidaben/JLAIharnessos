/**
 * 健澜科技 jlmedaios - 零信任访问与权限最小化 V5 路由（M282-B）
 *
 * GET  /api/v1/zero-trust（策略看板）
 * POST /api/v1/zero-trust/policy（策略变更）
 * GET  /api/v1/zero-trust/risk（风险会话）
 *
 * 权限：zero-trust:read / zero-trust:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  assessRiskV5,
  buildZeroTrustV5Report,
  enforceMFAV5,
  evaluatePolicyV5,
  type AccessPolicy,
  type SessionContext,
} from "../aggregators/zeroTrustV5Aggregator.js";

const policyStore: AccessPolicy[] = [
  { userId: "u-001", role: "doctor", resource: "patient", action: "read", effect: "allow" },
  { userId: "u-002", role: "extern", resource: "patient", action: "write", effect: "deny" },
];

const sessionStore: SessionContext[] = [
  { userId: "u-001", ip: "10.0.0.1", isNewDevice: false, isImpossibleTravel: false, mfaPassed: true },
  { userId: "u-002", ip: "203.0.113.1", isNewDevice: true, isImpossibleTravel: true, mfaPassed: false },
];

export const zeroTrustV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/zero-trust",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "zero-trust:read");
      if (denied) return denied;

      return json(ok(buildZeroTrustV5Report(policyStore, sessionStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/zero-trust/policy",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "zero-trust:write");
      if (denied) return denied;

      const body = await c.req.json() as AccessPolicy;
      policyStore.push(body);
      const allowed = evaluatePolicyV5(policyStore, body.userId, body.resource, body.action);
      return json(ok({ policy: body, evaluated: allowed }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/zero-trust/risk",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "zero-trust:read");
      if (denied) return denied;

      const userId = c.query.get("userId") ?? "u-001";
      const session = sessionStore.find((s) => s.userId === userId);
      if (!session) {
        return json(ok({ found: false }));
      }
      const risk = assessRiskV5(session);
      return json(ok({ risk, mfaRequired: enforceMFAV5(risk) }));
    },
  },
];
