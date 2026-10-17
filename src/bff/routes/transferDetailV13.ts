/**
 * 健澜科技 jlmedaios - 转科管理（细节）V13 路由（M427-B，detail 避让旧版 transferMgmtV13（M411））
 *
 * GET /api/v1/transfer-detail
 *
 * 权限：transfer-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeTransferHandoverCompleteRateV13,
  computeTransferPatientSatisfactionRateV13,
  computeTransferRecordTimelyRateV13,
  type TransferDetailRecordV13,
} from "../aggregators/transferDetailV13Aggregator.js";

const records: TransferDetailRecordV13[] = [
  { handoverComplete: 980, transferTimely: 950, transferTotal: 1000, satisfiedPatients: 990, surveyedPatients: 1000 },
  { handoverComplete: 980, transferTimely: 950, transferTotal: 1000, satisfiedPatients: 990, surveyedPatients: 1000 },
];

export const transferDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/transfer-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "transfer-detail:read");
      if (denied) return denied;
      return json(ok({
        transferHandoverCompleteRate: computeTransferHandoverCompleteRateV13(records),
        transferRecordTimelyRate: computeTransferRecordTimelyRateV13(records),
        transferPatientSatisfactionRate: computeTransferPatientSatisfactionRateV13(records),
      }));
    },
  },
];
