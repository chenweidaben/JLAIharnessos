/**
 * 健澜科技 jlmedaios - 环境消毒合格率 V13 路由（M341-D）
 *
 * GET /api/v1/env-disinfection
 *
 * 权限：env-disinfection:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDisinfectionPassRateV13,
  type EnvDisinfectionRecordV13,
} from "../aggregators/envDisinfectionV13Aggregator.js";

const records: EnvDisinfectionRecordV13[] = [
  { totalSampled: 100, passCount: 95 },
];

export const envDisinfectionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/env-disinfection",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "env-disinfection:read");
      if (denied) return denied;
      return json(ok({
        passRate: computeDisinfectionPassRateV13(records),
      }));
    },
  },
];
