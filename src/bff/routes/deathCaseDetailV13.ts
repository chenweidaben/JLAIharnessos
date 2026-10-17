/**
 * 健澜科技 jlmedaios - 死亡病例管理（细节）V13 路由（M427-D，M427 收官，detail 避让旧版 deathCaseMgmtV13（M412））
 *
 * GET /api/v1/death-case-detail
 *
 * 权限：death-case-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDeathCaseDiscussionRateV13,
  computeDeathCaseDiscussionTimelyRateV13,
  computeDeathCaseRecordCompleteRateV13,
  type DeathCaseDetailRecordV13,
} from "../aggregators/deathCaseDetailV13Aggregator.js";

const records: DeathCaseDetailRecordV13[] = [
  { discussed: 95, deathTotal: 100, discussionTimely: 90, shouldDiscuss: 100, recordComplete: 98 },
  { discussed: 95, deathTotal: 100, discussionTimely: 90, shouldDiscuss: 100, recordComplete: 98 },
];

export const deathCaseDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/death-case-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "death-case-detail:read");
      if (denied) return denied;
      return json(ok({
        deathCaseDiscussionRate: computeDeathCaseDiscussionRateV13(records),
        deathCaseDiscussionTimelyRate: computeDeathCaseDiscussionTimelyRateV13(records),
        deathCaseRecordCompleteRate: computeDeathCaseRecordCompleteRateV13(records),
      }));
    },
  },
];
