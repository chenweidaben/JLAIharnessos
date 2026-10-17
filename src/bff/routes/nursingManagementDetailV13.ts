/**
 * 健澜科技 jlmedaios - 护理管理明细 V13 路由（M405-C）
 *
 * GET /api/v1/nursing-management-detail
 *
 * 权限：nursing-management-detail:read。避让旧版 nursingManagementV13（M376-D）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHeadNurseWardRoundPassRateV13,
  computeNursingAdverseEventReportRateV13,
  computeNursingQCPassRateV13,
  type NursingManagementDetailRecordV13,
} from "../aggregators/nursingManagementDetailV13Aggregator.js";

const records: NursingManagementDetailRecordV13[] = [
  { headPass: 980, headTotal: 1000, reported: 95, totalAdverse: 100, qcPass: 970, qcTotal: 1000 },
  { headPass: 980, headTotal: 1000, reported: 95, totalAdverse: 100, qcPass: 970, qcTotal: 1000 },
];

export const nursingManagementDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-management-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-management-detail:read");
      if (denied) return denied;
      return json(ok({
        headNurseWardRoundPassRate: computeHeadNurseWardRoundPassRateV13(records),
        nursingAdverseEventReportRate: computeNursingAdverseEventReportRateV13(records),
        nursingQCPassRate: computeNursingQCPassRateV13(records),
      }));
    },
  },
];
