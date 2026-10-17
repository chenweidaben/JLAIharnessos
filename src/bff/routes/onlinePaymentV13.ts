/**
 * 健澜科技 jlmedaios - 在线支付 V13 路由（M367-C）
 *
 * GET /api/v1/online-payment
 *
 * 权限：online-payment:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeOnlinePaymentAmountV13,
  computeOnlinePaymentCountV13,
  computePaymentSuccessRateV13,
  type OnlinePaymentRecordV13,
} from "../aggregators/onlinePaymentV13Aggregator.js";

const records: OnlinePaymentRecordV13[] = [
  { paymentCount: 1000, paymentAmount: 50000, paymentSuccess: 980 },
  { paymentCount: 1000, paymentAmount: 50000, paymentSuccess: 980 },
];

export const onlinePaymentV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/online-payment",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "online-payment:read");
      if (denied) return denied;
      return json(ok({
        onlinePaymentCount: computeOnlinePaymentCountV13(records),
        onlinePaymentAmount: computeOnlinePaymentAmountV13(records),
        paymentSuccessRate: computePaymentSuccessRateV13(records),
      }));
    },
  },
];
