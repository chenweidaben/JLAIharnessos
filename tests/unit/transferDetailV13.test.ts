/**
 * 健澜科技 jlmedaios - 转科管理（细节）V13 单测（M427-B，detail 避让旧版 transferMgmtV13（M411））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeTransferHandoverCompleteRateV13,
  computeTransferPatientSatisfactionRateV13,
  computeTransferRecordTimelyRateV13,
  type TransferDetailRecordV13,
} from "../../src/bff/aggregators/transferDetailV13Aggregator";
import { transferDetailV13Routes } from "../../src/bff/routes/transferDetailV13";

const records: TransferDetailRecordV13[] = [
  { handoverComplete: 980, transferTimely: 950, transferTotal: 1000, satisfiedPatients: 990, surveyedPatients: 1000 },
  { handoverComplete: 980, transferTimely: 950, transferTotal: 1000, satisfiedPatients: 990, surveyedPatients: 1000 },
];

describe("computeTransferHandoverCompleteRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("转科交接完整率 = 98.00%", () => {
    expect(computeTransferHandoverCompleteRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeTransferHandoverCompleteRateV13([])).toBe(0);
  });
});

describe("computeTransferRecordTimelyRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("转科记录及时率 = 95.00%", () => {
    expect(computeTransferRecordTimelyRateV13(records)).toBe(95.00);
  });
});

describe("computeTransferPatientSatisfactionRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("转科患者满意度 = 99.00%", () => {
    expect(computeTransferPatientSatisfactionRateV13(records)).toBe(99.00);
  });
});

describe("transferDetailV13Routes 读路由", () => {
  it("GET /api/v1/transfer-detail 路由存在且 auth:true", () => {
    const route = transferDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/transfer-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
