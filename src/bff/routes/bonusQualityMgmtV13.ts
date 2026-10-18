/**
 * 健澜科技 jlmedaios - 奖金分配质量管理 V13 路由（M433-C，-quality 后缀避让旧版 bonusMgmtV13（M410））
 *
 * GET /api/v1/bonus-quality-mgmt
 *
 * 权限：bonus-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBonusAccountingAccuracyRateV13,
  computeBonusAppealResolutionRateV13,
  computeBonusPaymentTimelinessRateV13,
  type BonusQualityMgmtRecordV13,
} from "../aggregators/bonusQualityMgmtV13Aggregator.js";

const records: BonusQualityMgmtRecordV13[] = [
  { accurateCount: 990, totalCount: 1000, timelyPayment: 950, shouldPayment: 1000, resolvedAppeals: 980, acceptedAppeals: 1000 },
  { accurateCount: 990, totalCount: 1000, timelyPayment: 950, shouldPayment: 1000, resolvedAppeals: 980, acceptedAppeals: 1000 },
];

export const bonusQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/bonus-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "bonus-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        bonusAccountingAccuracyRate: computeBonusAccountingAccuracyRateV13(records),
        bonusPaymentTimelinessRate: computeBonusPaymentTimelinessRateV13(records),
        bonusAppealResolutionRate: computeBonusAppealResolutionRateV13(records),
      }));
    },
  },
];
