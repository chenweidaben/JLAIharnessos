/**
 * 健澜科技 jlmedaios - 线上支付明细 V13 路由（M399-C，避让旧版 onlinePaymentV13）
 *
 * GET /api/v1/online-payment-detail
 *
 * 权限：online-payment-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeOnlinePaymentCountV13,
  computeOnlinePaymentRatioV13,
  computeRefundHandlingTimelyRateV13,
  type OnlinePaymentDetailRecordV13,
} from "../aggregators/onlinePaymentDetailV13Aggregator.js";

const records: OnlinePaymentDetailRecordV13[] = [
  { onlineCount: 600, totalCount: 1000, timelyRefundCount: 80, totalRefundCount: 100 },
  { onlineCount: 600, totalCount: 1000, timelyRefundCount: 80, totalRefundCount: 100 },
];

export const onlinePaymentDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/online-payment-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "online-payment-detail:read");
      if (denied) return denied;
      return json(ok({
        onlinePaymentCount: computeOnlinePaymentCountV13(records),
        onlinePaymentRatio: computeOnlinePaymentRatioV13(records),
        refundHandlingTimelyRate: computeRefundHandlingTimelyRateV13(records),
      }));
    },
  },
];
