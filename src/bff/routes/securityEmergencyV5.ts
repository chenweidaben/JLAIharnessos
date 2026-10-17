/**
 * 健澜科技 jlmedaios - 安保消防与应急指挥 V5 路由（M279-B）
 *
 * POST /api/v1/security-emergency（事件上报）
 * GET  /api/v1/security-emergency（应急指挥看板）
 * POST /api/v1/security-emergency/drill（演练记录）
 *
 * 权限：security-emergency:read / security-emergency:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  assessFireSafetyV5,
  buildSecurityEmergencyV5Report,
  dispatchEmergencyV5,
  type FireCheck,
  type SecurityEvent,
} from "../aggregators/securityEmergencyV5Aggregator.js";

const eventStore: SecurityEvent[] = [
  { incidentType: "电梯困人", location: "门诊楼", severity: 2, peopleInvolved: 1 },
  { incidentType: "火灾(冒烟)", location: "食堂", severity: 8, peopleInvolved: 6 },
];

const checkStore: FireCheck[] = [
  { item: "灭火器有效期", passed: true },
  { item: "疏散通道", passed: true },
  { item: "消防泵", passed: false },
];

export const securityEmergencyV5Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/security-emergency",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "security-emergency:write");
      if (denied) return denied;

      const body = await c.req.json() as SecurityEvent;
      eventStore.push(body);
      const dispatch = dispatchEmergencyV5(body);
      return json(ok(dispatch));
    },
  },
  {
    method: "GET",
    path: "/api/v1/security-emergency",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "security-emergency:read");
      if (denied) return denied;

      return json(ok(buildSecurityEmergencyV5Report(eventStore, checkStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/security-emergency/drill",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "security-emergency:write");
      if (denied) return denied;

      const body = await c.req.json() as { scenario: string; participants: number; passed: boolean };
      return json(ok({ recorded: true, ...body }));
    },
  },
];
