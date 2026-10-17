/**
 * 健澜科技 jlmedaios - 手术量分级 V13 路由（M339-A）
 *
 * GET /api/v1/surgery-volume
 *
 * 权限：surgery-volume:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeGradeDistributionV13,
  type SurgeryVolumeRecordV13,
} from "../aggregators/surgeryVolumeV13Aggregator.js";

const records: SurgeryVolumeRecordV13[] = [
  { grade: "一级", count: 20 },
  { grade: "二级", count: 30 },
  { grade: "三级", count: 40 },
  { grade: "四级", count: 10 },
];

export const surgeryVolumeV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/surgery-volume",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "surgery-volume:read");
      if (denied) return denied;
      return json(ok({
        distribution: computeGradeDistributionV13(records),
      }));
    },
  },
];
