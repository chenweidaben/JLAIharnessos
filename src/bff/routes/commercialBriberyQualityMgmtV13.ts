/**
 * 健澜科技 jlmedaios - 商业贿赂治理质量管理 V13 路由（M438-C，行风廉洁与职业道德建设组）
 *
 * GET /api/v1/commercial-bribery-quality-mgmt
 *
 * 权限：commercial-bribery-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCommercialBriberyContractSignRateV13,
  computeCommercialBriberySupplierCommitmentRateV13,
  computeCommercialBriberyViolationInvestigationRateV13,
  type CommercialBriberyQualityMgmtRecordV13,
} from "../aggregators/commercialBriberyQualityMgmtV13Aggregator.js";

const records: CommercialBriberyQualityMgmtRecordV13[] = [
  { signedContracts: 950, totalContracts: 1000, investigatedCases: 950, totalViolationCases: 1000, committedSuppliers: 950, totalSuppliers: 1000 },
  { signedContracts: 950, totalContracts: 1000, investigatedCases: 950, totalViolationCases: 1000, committedSuppliers: 950, totalSuppliers: 1000 },
];

export const commercialBriberyQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/commercial-bribery-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "commercial-bribery-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        commercialBriberyContractSignRate: computeCommercialBriberyContractSignRateV13(records),
        commercialBriberyViolationInvestigationRate: computeCommercialBriberyViolationInvestigationRateV13(records),
        commercialBriberySupplierCommitmentRate: computeCommercialBriberySupplierCommitmentRateV13(records),
      }));
    },
  },
];
