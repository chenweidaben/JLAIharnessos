/**
 * 健澜科技 jlmedaios - AI 模型漂移监控 V13 路由（M325-C）
 *
 * GET /api/v1/ai-model-drift
 *
 * 权限：ai-model-drift:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDriftReportV13,
  type DistributionV13,
} from "../aggregators/aiModelDriftV13Aggregator.js";

const current: DistributionV13[] = [
  { bin: "low", probability: 0.5 },
  { bin: "mid", probability: 0.3 },
  { bin: "high", probability: 0.2 },
];

const baseline: DistributionV13[] = [
  { bin: "low", probability: 0.4 },
  { bin: "mid", probability: 0.4 },
  { bin: "high", probability: 0.2 },
];

export const aiModelDriftV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ai-model-drift",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ai-model-drift:read");
      if (denied) return denied;
      const report = buildDriftReportV13(current, baseline);
      return json(ok(report));
    },
  },
];
