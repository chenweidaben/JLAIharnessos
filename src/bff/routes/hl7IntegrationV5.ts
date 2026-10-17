/**
 * 健澜科技 jlmedaios - HL7 / WS363 标准对接升级 V5 路由（M281-B）
 *
 * POST /api/v1/hl7-integration/send（消息收发）
 * GET  /api/v1/hl7-integration/parse（解析结果）
 * POST /api/v1/hl7-integration/ws363（国标校验）
 *
 * 权限：hl7-integration:read / hl7-integration:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildHl7IntegrationV5Report,
  buildHL7V5,
  parseHL7V5,
  validateWS363V5,
} from "../aggregators/hl7IntegrationV5Aggregator.js";

const messageStore: import("../aggregators/hl7IntegrationV5Aggregator.js").HL7Message[] = [];
const ws363Results: boolean[] = [true, true, false];

export const hl7IntegrationV5Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/hl7-integration/send",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "hl7-integration:write");
      if (denied) return denied;

      const body = await c.req.json() as { type: string; sender: string; receiver: string; patientId: string };
      const msg = buildHL7V5(body.type, { sender: body.sender, receiver: body.receiver, patientId: body.patientId });
      messageStore.push(parseHL7V5(msg));
      return json(ok({ sent: true, message: msg }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/hl7-integration/parse",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "hl7-integration:read");
      if (denied) return denied;

      const msg = c.query.get("msg") ?? "ADT^A01|HOSP-A|EMR|p-001";
      return json(ok(parseHL7V5(msg)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/hl7-integration/ws363",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "hl7-integration:write");
      if (denied) return denied;

      const body = await c.req.json() as { patientId: string; name: string; gender: string; birthDate: string };
      const result = validateWS363V5(body);
      ws363Results.push(result.compliant);
      return json(ok(result));
    },
  },
  {
    method: "GET",
    path: "/api/v1/hl7-integration/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "hl7-integration:read");
      if (denied) return denied;

      return json(ok(buildHl7IntegrationV5Report(messageStore, ws363Results)));
    },
  },
];
