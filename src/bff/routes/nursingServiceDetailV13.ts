/**
 * 健澜科技 jlmedaios - 护理服务明细 V13 路由（M405-D，M405 收官）
 *
 * GET /api/v1/nursing-service-detail
 *
 * 权限：nursing-service-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHighQualityNursingServiceCoverageRateV13,
  computeNursingAssistantCertifiedRateV13,
  computeResponsibilityHolisticNursingCoverageRateV13,
  type NursingServiceDetailRecordV13,
} from "../aggregators/nursingServiceDetailV13Aggregator.js";

const records: NursingServiceDetailRecordV13[] = [
  { qualityCovered: 95, qualityShould: 100, respCovered: 98, respShould: 100, certified: 900, totalAssistant: 1000 },
  { qualityCovered: 95, qualityShould: 100, respCovered: 98, respShould: 100, certified: 900, totalAssistant: 1000 },
];

export const nursingServiceDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-service-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-service-detail:read");
      if (denied) return denied;
      return json(ok({
        highQualityNursingServiceCoverageRate: computeHighQualityNursingServiceCoverageRateV13(records),
        responsibilityHolisticNursingCoverageRate: computeResponsibilityHolisticNursingCoverageRateV13(records),
        nursingAssistantCertifiedRate: computeNursingAssistantCertifiedRateV13(records),
      }));
    },
  },
];
