/**
 * 健澜科技 jlmedaios - 转科转院管理 V13 路由（M411-C）
 *
 * GET /api/v1/inpatient-transfer-mgmt
 *
 * 权限：inpatient-transfer-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeTransferAssessmentCompletionRateV13,
  computeTransferHandoverPassRateV13,
  computeTransferRecordCompletenessRateV13,
  type InpatientTransferMgmtRecordV13,
} from "../aggregators/inpatientTransferMgmtV13Aggregator.js";

const records: InpatientTransferMgmtRecordV13[] = [
  { complete: 95, recordTotal: 100, assessed: 90, transferTotal: 100, qualified: 98, handoverTotal: 100 },
  { complete: 95, recordTotal: 100, assessed: 90, transferTotal: 100, qualified: 98, handoverTotal: 100 },
];

export const inpatientTransferMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/inpatient-transfer-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "inpatient-transfer-mgmt:read");
      if (denied) return denied;
      return json(ok({
        transferRecordCompletenessRate: computeTransferRecordCompletenessRateV13(records),
        transferAssessmentCompletionRate: computeTransferAssessmentCompletionRateV13(records),
        transferHandoverPassRate: computeTransferHandoverPassRateV13(records),
      }));
    },
  },
];
