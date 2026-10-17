/**
 * 健澜科技 jlmedaios - 检验质量 V13 路由（M360-A，新规格）
 *
 * GET /api/v1/lab-quality
 *
 * 权限：lab-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeExternalQcPassRateV13,
  computeInternalQcPassRateV13,
  computeLabReportTimelyRateV13,
  type LabQualityRecordV13,
} from "../aggregators/labQualityV13Aggregator.js";

const records: LabQualityRecordV13[] = [
  { internalQcPassed: 480, internalQcCount: 500, externalQcPassed: 90, externalQcCount: 100, reportTimely: 950, reportCount: 1000 },
  { internalQcPassed: 470, internalQcCount: 500, externalQcPassed: 90, externalQcCount: 100, reportTimely: 940, reportCount: 1000 },
];

export const labQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/lab-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "lab-quality:read");
      if (denied) return denied;
      return json(ok({
        internalQcPassRate: computeInternalQcPassRateV13(records),
        externalQcPassRate: computeExternalQcPassRateV13(records),
        labReportTimelyRate: computeLabReportTimelyRateV13(records),
      }));
    },
  },
];
