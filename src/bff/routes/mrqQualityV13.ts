/**
 * 健澜科技 jlmedaios - 病案质量 V13 路由（M334-A）
 *
 * GET /api/v1/mrq-quality
 *
 * 权限：mrq-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDefectRateV13,
  computeGradeARateV13,
  computeGradeCRateV13,
  type MRQRecordV13,
} from "../aggregators/mrqQualityV13Aggregator.js";

const records: MRQRecordV13[] = [
  { totalRecords: 100, gradeACount: 95, gradeCCount: 2, defectCount: 5 },
];

export const mrqQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/mrq-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "mrq-quality:read");
      if (denied) return denied;
      return json(ok({
        gradeARate: computeGradeARateV13(records),
        gradeCRate: computeGradeCRateV13(records),
        defectRate: computeDefectRateV13(records),
      }));
    },
  },
];
