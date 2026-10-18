/**
 * 健澜科技 jlmedaios - 内镜质量管理 V13 路由（M429-B，-quality 后缀避让旧版 endoscopyMgmtV13（M417））
 *
 * GET /api/v1/endoscopy-quality-mgmt
 *
 * 权限：endoscopy-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEndoscopyCleanDisinfectionPassRateV13,
  computeEndoscopyComplicationRateV13,
  computeEndoscopyMissRateV13,
  type EndoscopyQualityMgmtRecordV13,
} from "../aggregators/endoscopyQualityMgmtV13Aggregator.js";

const records: EndoscopyQualityMgmtRecordV13[] = [
  { cleanPass: 980, endoTotal: 1000, complication: 10, miss: 5, endoProcedureTotal: 10000 },
  { cleanPass: 980, endoTotal: 1000, complication: 10, miss: 5, endoProcedureTotal: 10000 },
];

export const endoscopyQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/endoscopy-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "endoscopy-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        endoscopyCleanDisinfectionPassRate: computeEndoscopyCleanDisinfectionPassRateV13(records),
        endoscopyComplicationRate: computeEndoscopyComplicationRateV13(records),
        endoscopyMissRate: computeEndoscopyMissRateV13(records),
      }));
    },
  },
];
