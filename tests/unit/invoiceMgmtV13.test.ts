/**
 * 健澜科技 jlmedaios - 票据管理 V13 单测（M448-D，M448 收官，财务与收费管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInvoiceElectronicIssuanceRateV13,
  computeInvoiceRequisitionComplianceRateV13,
  computeInvoiceWriteOffRateV13,
  type InvoiceMgmtRecordV13,
} from "../../src/bff/aggregators/invoiceMgmtV13Aggregator";
import { invoiceMgmtV13Routes } from "../../src/bff/routes/invoiceMgmtV13";

const records: InvoiceMgmtRecordV13[] = [
  { compliant: 950, totalRequisition: 1000, writtenOff: 900, totalInvoice: 1000, electronic: 980, totalIssued: 1000 },
  { compliant: 950, totalRequisition: 1000, writtenOff: 900, totalInvoice: 1000, electronic: 980, totalIssued: 1000 },
];

describe("computeInvoiceRequisitionComplianceRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("票据领用合规率 = 95.00%", () => {
    expect(computeInvoiceRequisitionComplianceRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeInvoiceRequisitionComplianceRateV13([])).toBe(0);
  });
});

describe("computeInvoiceWriteOffRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("票据核销率 = 90.00%", () => {
    expect(computeInvoiceWriteOffRateV13(records)).toBe(90.00);
  });
});

describe("computeInvoiceElectronicIssuanceRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("电子票据开具率 = 98.00%", () => {
    expect(computeInvoiceElectronicIssuanceRateV13(records)).toBe(98.00);
  });
});

describe("invoiceMgmtV13Routes 读路由", () => {
  it("GET /api/v1/invoice-mgmt 路由存在且 auth:true", () => {
    const route = invoiceMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/invoice-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
