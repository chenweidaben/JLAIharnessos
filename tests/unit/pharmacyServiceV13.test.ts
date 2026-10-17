/**
 * 健澜科技 jlmedaios - 药学服务 V13 单测（M359-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeClinicalPharmacistRoundRateV13,
  computeInpatientOrderPassRateV13,
  computeOutpatientPrescriptionPassRateV13,
  type PharmacyServiceRecordV13,
} from "../../src/bff/aggregators/pharmacyServiceV13Aggregator";
import { pharmacyServiceV13Routes } from "../../src/bff/routes/pharmacyServiceV13";

const records: PharmacyServiceRecordV13[] = [
  { outpatientPrescriptionPassed: 95, outpatientPrescriptionCount: 100, inpatientOrderPassed: 480, inpatientOrderCount: 500, clinicalPharmacistRounds: 90, shouldRounds: 100 },
  { outpatientPrescriptionPassed: 95, outpatientPrescriptionCount: 100, inpatientOrderPassed: 470, inpatientOrderCount: 500, clinicalPharmacistRounds: 90, shouldRounds: 100 },
];

describe("computeOutpatientPrescriptionPassRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("门诊处方合格率 = 95.00%", () => {
    expect(computeOutpatientPrescriptionPassRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientPrescriptionPassRateV13([])).toBe(0);
  });
});

describe("computeInpatientOrderPassRateV13", () => {
  // 算式：(480+470)/(500+500) = 950/1000×100 = 95.00
  it("住院医嘱合格率 = 95.00%", () => {
    expect(computeInpatientOrderPassRateV13(records)).toBe(95.00);
  });
});

describe("computeClinicalPharmacistRoundRateV13", () => {
  // 算式：(90+90)/(100+100) = 180/200×100 = 90.00
  it("临床药师参与查房率 = 90.00%", () => {
    expect(computeClinicalPharmacistRoundRateV13(records)).toBe(90.00);
  });
});

describe("pharmacyServiceV13Routes 读路由", () => {
  it("GET /api/v1/pharmacy-service 路由存在且 auth:true", () => {
    const route = pharmacyServiceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/pharmacy-service",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
