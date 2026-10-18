/**
 * 健澜科技 jlmedaios - 门诊治疗室管理 V13 路由（M458-C，日间手术与门诊操作管理组）
 *
 * GET /api/v1/outpatient-treatment-room-mgmt
 *
 * 权限：outpatient-treatment-room-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeOutpatientTreatmentRoomDisinfectionQualifiedRateV13,
  computeOutpatientTreatmentRoomOperationQualifiedRateV13,
  computeOutpatientTreatmentRoomVisitCountV13,
  type OutpatientTreatmentRoomMgmtRecordV13,
} from "../aggregators/outpatientTreatmentRoomMgmtV13Aggregator.js";

const records: OutpatientTreatmentRoomMgmtRecordV13[] = [
  { visitCount: 950, qualified: 900, totalOp: 1000, disinfected: 980, totalDisinfection: 1000 },
  { visitCount: 950, qualified: 900, totalOp: 1000, disinfected: 980, totalDisinfection: 1000 },
];

export const outpatientTreatmentRoomMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/outpatient-treatment-room-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "outpatient-treatment-room-mgmt:read");
      if (denied) return denied;
      return json(ok({
        outpatientTreatmentRoomVisitCount: computeOutpatientTreatmentRoomVisitCountV13(records),
        outpatientTreatmentRoomOperationQualifiedRate: computeOutpatientTreatmentRoomOperationQualifiedRateV13(records),
        outpatientTreatmentRoomDisinfectionQualifiedRate: computeOutpatientTreatmentRoomDisinfectionQualifiedRateV13(records),
      }));
    },
  },
];
