/**
 * 健澜科技 jlmedaios - 院感发生率 V13 路由（M341-B）
 *
 * GET /api/v1/nosocomial-infection
 *
 * 权限：nosocomial-infection:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInfectionRatePer1000BedDaysV13,
  type NosocomialInfectionRecordV13,
} from "../aggregators/nosocomialInfectionV13Aggregator.js";

const records: NosocomialInfectionRecordV13[] = [
  { bedDays: 2000, infectionCount: 10 },
];

export const nosocomialInfectionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nosocomial-infection",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nosocomial-infection:read");
      if (denied) return denied;
      return json(ok({
        infectionRatePer1000BedDays: computeInfectionRatePer1000BedDaysV13(records),
      }));
    },
  },
];
