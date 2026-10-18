/**
 * 健澜科技 jlmedaios - 票据管理 V13 路由（M448-D，M448 收官，财务与收费管理组）
 *
 * GET /api/v1/invoice-mgmt
 *
 * 权限：invoice-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInvoiceElectronicIssuanceRateV13,
  computeInvoiceRequisitionComplianceRateV13,
  computeInvoiceWriteOffRateV13,
  type InvoiceMgmtRecordV13,
} from "../aggregators/invoiceMgmtV13Aggregator.js";

const records: InvoiceMgmtRecordV13[] = [
  { compliant: 950, totalRequisition: 1000, writtenOff: 900, totalInvoice: 1000, electronic: 980, totalIssued: 1000 },
  { compliant: 950, totalRequisition: 1000, writtenOff: 900, totalInvoice: 1000, electronic: 980, totalIssued: 1000 },
];

export const invoiceMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/invoice-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "invoice-mgmt:read");
      if (denied) return denied;
      return json(ok({
        invoiceRequisitionComplianceRate: computeInvoiceRequisitionComplianceRateV13(records),
        invoiceWriteOffRate: computeInvoiceWriteOffRateV13(records),
        invoiceElectronicIssuanceRate: computeInvoiceElectronicIssuanceRateV13(records),
      }));
    },
  },
];
