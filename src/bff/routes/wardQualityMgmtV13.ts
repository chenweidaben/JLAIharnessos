/**
 * 健澜科技 jlmedaios - 病房质量管理 V13 路由（M429-D，M429 收官，-quality 后缀避让旧版 wardMgmtDetailV13（M417））
 *
 * GET /api/v1/ward-quality-mgmt
 *
 * 权限：ward-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeWardHealthEducationCoverageRateV13,
  computeWardNursingPassRateV13,
  computeWardPatientSatisfactionRateV13,
  type WardQualityMgmtRecordV13,
} from "../aggregators/wardQualityMgmtV13Aggregator.js";

const records: WardQualityMgmtRecordV13[] = [
  { nursingPass: 980, nursingTotal: 1000, eduCovered: 950, inpatientTotal: 1000, satisfied: 990, surveyedTotal: 1000 },
  { nursingPass: 980, nursingTotal: 1000, eduCovered: 950, inpatientTotal: 1000, satisfied: 990, surveyedTotal: 1000 },
];

export const wardQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ward-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ward-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        wardNursingPassRate: computeWardNursingPassRateV13(records),
        wardHealthEducationCoverageRate: computeWardHealthEducationCoverageRateV13(records),
        wardPatientSatisfactionRate: computeWardPatientSatisfactionRateV13(records),
      }));
    },
  },
];
