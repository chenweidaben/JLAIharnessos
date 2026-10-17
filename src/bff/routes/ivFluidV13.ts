/**
 * 健澜科技 jlmedaios - 静脉输液率 V13 路由（M336-D）
 *
 * GET /api/v1/iv-fluid
 *
 * 权限：iv-fluid:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInpatientIVRateV13,
  computeOutpatientIVRateV13,
  type IVFluidRecordV13,
} from "../aggregators/ivFluidV13Aggregator.js";

const records: IVFluidRecordV13[] = [
  {
    outpatientTotalVisits: 1000,
    outpatientIVVisits: 100,
    inpatientTotalPatients: 500,
    inpatientIVPatients: 300,
  },
];

export const ivFluidV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/iv-fluid",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "iv-fluid:read");
      if (denied) return denied;
      return json(ok({
        outpatientIVRate: computeOutpatientIVRateV13(records),
        inpatientIVRate: computeInpatientIVRateV13(records),
      }));
    },
  },
];
