/**
 * 健澜科技 jlmedaios - 会诊管理 V13 路由（M404-B）
 *
 * GET /api/v1/consultation-mgmt
 *
 * 权限：consultation-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeConsultationOpinionExecutionRateV13,
  computeEmergencyConsultationArrivalTimeV13,
  computeGeneralConsultationTimelyRateV13,
  type ConsultationMgmtRecordV13,
} from "../aggregators/consultationMgmtV13Aggregator.js";

const records: ConsultationMgmtRecordV13[] = [
  { timelyGeneral: 950, totalGeneral: 1000, emergencyArrival: 5.3, executed: 980, totalOpinion: 1000 },
  { timelyGeneral: 950, totalGeneral: 1000, emergencyArrival: 5.3, executed: 980, totalOpinion: 1000 },
];

export const consultationMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/consultation-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "consultation-mgmt:read");
      if (denied) return denied;
      return json(ok({
        generalConsultationTimelyRate: computeGeneralConsultationTimelyRateV13(records),
        emergencyConsultationArrivalTime: computeEmergencyConsultationArrivalTimeV13(records),
        consultationOpinionExecutionRate: computeConsultationOpinionExecutionRateV13(records),
      }));
    },
  },
];
