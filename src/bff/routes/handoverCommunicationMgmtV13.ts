/**
 * 健澜科技 jlmedaios - 交接班沟通管理 V13 路由（M425-B，换名避让旧版 handoverDetailV13（M413））
 *
 * GET /api/v1/handover-communication-mgmt
 *
 * 权限：handover-communication-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHandoverOmissionRateV13,
  computeHandoverRecordCompleteRateV13,
  computeSbarHandoverComplianceRateV13,
  type HandoverCommunicationMgmtRecordV13,
} from "../aggregators/handoverCommunicationMgmtV13Aggregator.js";

const records: HandoverCommunicationMgmtRecordV13[] = [
  { sbarCompliant: 980, omission: 5, recordComplete: 990, handoverTotal: 1000 },
  { sbarCompliant: 980, omission: 5, recordComplete: 990, handoverTotal: 1000 },
];

export const handoverCommunicationMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/handover-communication-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "handover-communication-mgmt:read");
      if (denied) return denied;
      return json(ok({
        sbarHandoverComplianceRate: computeSbarHandoverComplianceRateV13(records),
        handoverOmissionRate: computeHandoverOmissionRateV13(records),
        handoverRecordCompleteRate: computeHandoverRecordCompleteRateV13(records),
      }));
    },
  },
];
