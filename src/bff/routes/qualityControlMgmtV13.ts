/**
 * 健澜科技 jlmedaios - 质控管理 V13 路由（M419-D，M419 收官）
 *
 * GET /api/v1/quality-control-mgmt
 *
 * 权限：quality-control-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeQualityControlGroupActivityRateV13,
  computeQualityIndicatorAchieveRateV13,
  computeQualityIssueRectificationRateV13,
  type QualityControlMgmtRecordV13,
} from "../aggregators/qualityControlMgmtV13Aggregator.js";

const records: QualityControlMgmtRecordV13[] = [
  { groupActivityDone: 95, groupActivityShould: 100, issueRectified: 98, issueTotal: 100, indicatorAchieved: 90, indicatorTotal: 100 },
  { groupActivityDone: 95, groupActivityShould: 100, issueRectified: 98, issueTotal: 100, indicatorAchieved: 90, indicatorTotal: 100 },
];

export const qualityControlMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/quality-control-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "quality-control-mgmt:read");
      if (denied) return denied;
      return json(ok({
        qualityControlGroupActivityRate: computeQualityControlGroupActivityRateV13(records),
        qualityIssueRectificationRate: computeQualityIssueRectificationRateV13(records),
        qualityIndicatorAchieveRate: computeQualityIndicatorAchieveRateV13(records),
      }));
    },
  },
];
