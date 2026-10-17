/**
 * 健澜科技 jlmedaios - 病理管理 V13 路由（M415-C）
 *
 * GET /api/v1/pathology-mgmt
 *
 * 权限：pathology-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFrozenVsParaffinMatchRateV13,
  computePathologyDiagnosisMatchRateV13,
  computeRoutinePathologyReportTimelyRateV13,
  type PathologyMgmtRecordV13,
} from "../aggregators/pathologyMgmtV13Aggregator.js";

const records: PathologyMgmtRecordV13[] = [
  { timely: 950, reportTotal: 1000, match: 980, diagnosisTotal: 1000, frozenParaffinMatch: 900, frozenTotal: 1000 },
  { timely: 950, reportTotal: 1000, match: 980, diagnosisTotal: 1000, frozenParaffinMatch: 900, frozenTotal: 1000 },
];

export const pathologyMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pathology-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pathology-mgmt:read");
      if (denied) return denied;
      return json(ok({
        routinePathologyReportTimelyRate: computeRoutinePathologyReportTimelyRateV13(records),
        pathologyDiagnosisMatchRate: computePathologyDiagnosisMatchRateV13(records),
        frozenVsParaffinMatchRate: computeFrozenVsParaffinMatchRateV13(records),
      }));
    },
  },
];
