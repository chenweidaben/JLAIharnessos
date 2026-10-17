/**
 * 健澜科技 jlmedaios - 死亡病例管理 V13 路由（M412-A）
 *
 * GET /api/v1/death-report-mgmt
 *
 * 权限：death-report-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDeathCaseDiscussionRateV13,
  computeDeathCauseRegistrationPassRateV13,
  computeDeathReportTimelyRateV13,
  type DeathReportMgmtRecordV13,
} from "../aggregators/deathReportMgmtV13Aggregator.js";

const records: DeathReportMgmtRecordV13[] = [
  { discussed: 95, deathTotal: 100, timely: 98, reportTotal: 100, qualified: 99, registrationTotal: 100 },
  { discussed: 95, deathTotal: 100, timely: 98, reportTotal: 100, qualified: 99, registrationTotal: 100 },
];

export const deathReportMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/death-report-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "death-report-mgmt:read");
      if (denied) return denied;
      return json(ok({
        deathCaseDiscussionRate: computeDeathCaseDiscussionRateV13(records),
        deathReportTimelyRate: computeDeathReportTimelyRateV13(records),
        deathCauseRegistrationPassRate: computeDeathCauseRegistrationPassRateV13(records),
      }));
    },
  },
];
