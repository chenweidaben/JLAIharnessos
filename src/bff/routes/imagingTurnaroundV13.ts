/**
 * 健澜科技 jlmedaios - 影像报告周转时间 V13 路由（M338-B）
 *
 * GET /api/v1/imaging-turnaround
 *
 * 权限：imaging-turnaround:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCTTATV13,
  computeMRITATV13,
  computeXRayTATV13,
  type ImagingTurnaroundRecordV13,
} from "../aggregators/imagingTurnaroundV13Aggregator.js";

const records: ImagingTurnaroundRecordV13[] = [
  { xrayTATHours: 1, ctTATHours: 2, mriTATHours: 3 },
  { xrayTATHours: 2, ctTATHours: 4, mriTATHours: 6 },
  { xrayTATHours: 3, ctTATHours: 6, mriTATHours: 9 },
];

export const imagingTurnaroundV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/imaging-turnaround",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "imaging-turnaround:read");
      if (denied) return denied;
      return json(ok({
        xrayTAT: computeXRayTATV13(records),
        ctTAT: computeCTTATV13(records),
        mriTAT: computeMRITATV13(records),
      }));
    },
  },
];
