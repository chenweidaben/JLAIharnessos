/**
 * 健澜科技 jlmedaios - 医联体与分级诊疗 V13 路由（M355-D，M355 收官）
 *
 * GET /api/v1/medical-alliance
 *
 * 权限：medical-alliance:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDownwardReferralCountV13,
  computeRemoteConsultationCountV13,
  computeUpwardReferralCountV13,
  type MedicalAllianceRecordV13,
} from "../aggregators/medicalAllianceV13Aggregator.js";

const records: MedicalAllianceRecordV13[] = [
  { downwardReferralCount: 100, upwardReferralCount: 150, remoteConsultationCount: 30 },
  { downwardReferralCount: 200, upwardReferralCount: 250, remoteConsultationCount: 70 },
];

export const medicalAllianceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-alliance",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-alliance:read");
      if (denied) return denied;
      return json(ok({
        downwardReferralCount: computeDownwardReferralCountV13(records),
        upwardReferralCount: computeUpwardReferralCountV13(records),
        remoteConsultationCount: computeRemoteConsultationCountV13(records),
      }));
    },
  },
];
