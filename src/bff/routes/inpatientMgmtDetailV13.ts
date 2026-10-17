/**
 * 健澜科技 jlmedaios - 住院管理（细节）V13 路由（M416-D，M416 收官，detail 避让旧版 inpatientBedMgmtV13）
 *
 * GET /api/v1/inpatient-mgmt-detail
 *
 * 权限：inpatient-mgmt-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInpatientMedicalRecordPassRateV13,
  computeInpatientPressureUlcerOccurrenceRateV13,
  computeInpatientStayOver30dRateV13,
  type InpatientMgmtDetailRecordV13,
} from "../aggregators/inpatientMgmtDetailV13Aggregator.js";

const records: InpatientMgmtDetailRecordV13[] = [
  { inpatientRecordQualified: 980, inpatientRecordTotal: 1000, over30d: 20, dischargeTotal: 1000, pressureUlcer: 5, inpatientCaseTotal: 1000 },
  { inpatientRecordQualified: 980, inpatientRecordTotal: 1000, over30d: 20, dischargeTotal: 1000, pressureUlcer: 5, inpatientCaseTotal: 1000 },
];

export const inpatientMgmtDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/inpatient-mgmt-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "inpatient-mgmt-detail:read");
      if (denied) return denied;
      return json(ok({
        inpatientMedicalRecordPassRate: computeInpatientMedicalRecordPassRateV13(records),
        inpatientStayOver30dRate: computeInpatientStayOver30dRateV13(records),
        inpatientPressureUlcerOccurrenceRate: computeInpatientPressureUlcerOccurrenceRateV13(records),
      }));
    },
  },
];
