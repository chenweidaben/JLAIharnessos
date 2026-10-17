/**
 * 健澜科技 jlmedaios - 反向证据熔断 V13 路由（M300-C）
 *
 * GET /api/v1/circuit-breaker
 *
 * 权限：circuit-breaker:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildCircuitBreakerReportV13,
  triggerCircuitBreakerV13,
  type BrokenExpV13,
} from "../aggregators/circuitBreakerV13Aggregator.js";

const broken: BrokenExpV13[] = [
  triggerCircuitBreakerV13("e-x1", "某抗凝经验", 3.5),
  triggerCircuitBreakerV13("e-x2", "某术后用药", 2.0),
];

export const circuitBreakerV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/circuit-breaker",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "circuit-breaker:read");
      if (denied) return denied;
      const report = buildCircuitBreakerReportV13(broken);
      return json(ok({ broken, report }));
    },
  },
];
