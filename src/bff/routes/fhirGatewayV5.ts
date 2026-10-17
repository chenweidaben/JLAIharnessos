/**
 * 健澜科技 jlmedaios - FHIR 资源建模与网关 V5 路由（M281-A）
 *
 * GET  /api/v1/fhir-gateway（调用日志看板）
 * POST /api/v1/fhir-gateway/resource（构造/校验 FHIR 资源）
 *
 * 权限：fhir-gateway:read / fhir-gateway:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildFHIRGatewayV5Report,
  buildFHIRResourceV5,
  validateFHIRV5,
  type FHIRGatewayLog,
} from "../aggregators/fhirGatewayV5Aggregator.js";

const logStore: FHIRGatewayLog[] = [
  { endpoint: "/Patient", method: "GET", resourceType: "Patient", status: 200, latencyMs: 80, caller: "emr" },
  { endpoint: "/Observation", method: "POST", resourceType: "Observation", status: 200, latencyMs: 120, caller: "lis" },
  { endpoint: "/Condition", method: "GET", resourceType: "Condition", status: 500, latencyMs: 300, caller: "emr" },
];

export const fhirGatewayV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/fhir-gateway",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "fhir-gateway:read");
      if (denied) return denied;

      return json(ok(buildFHIRGatewayV5Report(logStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/fhir-gateway/resource",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "fhir-gateway:write");
      if (denied) return denied;

      const body = await c.req.json() as { resourceType: string; id: string; status?: string };
      const resource = buildFHIRResourceV5(body.resourceType, { id: body.id, status: body.status });
      const validation = validateFHIRV5(resource);
      logStore.push({
        endpoint: `/${body.resourceType}`,
        method: "POST",
        resourceType: body.resourceType,
        status: validation.valid ? 201 : 400,
        latencyMs: 50,
        caller: "manual",
      });
      return json(ok({ resource, validation }));
    },
  },
];
