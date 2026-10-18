/**
 * 健澜科技 jlmedaios - 互联互通质量管理 V13 路由（M432-D，M432 收官，-quality 后缀避让旧版 interoperabilityMgmtV13（M409））
 *
 * GET /api/v1/interoperability-quality-mgmt
 *
 * 权限：interoperability-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInteroperabilityApiSuccessRateV13,
  computeInteroperabilityDataShareTimelinessRateV13,
  computeInteroperabilityTestPassRateV13,
  type InteroperabilityQualityMgmtRecordV13,
} from "../aggregators/interoperabilityQualityMgmtV13Aggregator.js";

const records: InteroperabilityQualityMgmtRecordV13[] = [
  { testPass: 980, testTotal: 1000, apiSuccess: 9900, apiTotal: 10000, timelyShare: 950, shouldShare: 1000 },
  { testPass: 980, testTotal: 1000, apiSuccess: 9900, apiTotal: 10000, timelyShare: 950, shouldShare: 1000 },
];

export const interoperabilityQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/interoperability-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "interoperability-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        interoperabilityTestPassRate: computeInteroperabilityTestPassRateV13(records),
        interoperabilityApiSuccessRate: computeInteroperabilityApiSuccessRateV13(records),
        interoperabilityDataShareTimelinessRate: computeInteroperabilityDataShareTimelinessRateV13(records),
      }));
    },
  },
];
