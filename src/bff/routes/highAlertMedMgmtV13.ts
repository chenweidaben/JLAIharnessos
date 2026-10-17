/**
 * 健澜科技 jlmedaios - 高危药品管理 V13 路由（M424-B）
 *
 * GET /api/v1/high-alert-med-mgmt
 *
 * 权限：high-alert-med-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHighAlertMedDoubleCheckRateV13,
  computeHighAlertMedLabelRateV13,
  computeHighAlertMedStorageComplianceRateV13,
  type HighAlertMedMgmtRecordV13,
} from "../aggregators/highAlertMedMgmtV13Aggregator.js";

const records: HighAlertMedMgmtRecordV13[] = [
  { labeled: 980, highAlertTotal: 1000, doubleChecked: 990, prescriptionTotal: 1000, compliantPoint: 970, storagePointTotal: 1000 },
  { labeled: 980, highAlertTotal: 1000, doubleChecked: 990, prescriptionTotal: 1000, compliantPoint: 970, storagePointTotal: 1000 },
];

export const highAlertMedMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/high-alert-med-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "high-alert-med-mgmt:read");
      if (denied) return denied;
      return json(ok({
        highAlertMedLabelRate: computeHighAlertMedLabelRateV13(records),
        highAlertMedDoubleCheckRate: computeHighAlertMedDoubleCheckRateV13(records),
        highAlertMedStorageComplianceRate: computeHighAlertMedStorageComplianceRateV13(records),
      }));
    },
  },
];
