/**
 * 健澜科技 jlmedaios - 临床药学服务质量管理 V13 单测（M440-D，M440 收官，药事管理与药学服务组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeClinicalPharmacyMonitoringCoverageRateV13,
  computeClinicalPharmacyOrderReviewRateV13,
  computeClinicalPharmacyRoundParticipationRateV13,
  type ClinicalPharmacyQualityRecordV13,
} from "../../src/bff/aggregators/clinicalPharmacyQualityV13Aggregator";
import { clinicalPharmacyQualityV13Routes } from "../../src/bff/routes/clinicalPharmacyQualityV13";

const records: ClinicalPharmacyQualityRecordV13[] = [
  { participatedRound: 950, shouldParticipate: 1000, reviewedOrder: 900, totalOrder: 1000, monitoredPatient: 850, shouldMonitor: 1000 },
  { participatedRound: 950, shouldParticipate: 1000, reviewedOrder: 900, totalOrder: 1000, monitoredPatient: 850, shouldMonitor: 1000 },
];

describe("computeClinicalPharmacyRoundParticipationRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("临床药师参与查房率 = 95.00%", () => {
    expect(computeClinicalPharmacyRoundParticipationRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeClinicalPharmacyRoundParticipationRateV13([])).toBe(0);
  });
});

describe("computeClinicalPharmacyOrderReviewRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("用药医嘱审核率 = 90.00%", () => {
    expect(computeClinicalPharmacyOrderReviewRateV13(records)).toBe(90.00);
  });
});

describe("computeClinicalPharmacyMonitoringCoverageRateV13", () => {
  // 算式：(850+850)/(1000+1000)×100 = 1700/2000×100 = 85.00
  it("药学监护覆盖率 = 85.00%", () => {
    expect(computeClinicalPharmacyMonitoringCoverageRateV13(records)).toBe(85.00);
  });
});

describe("clinicalPharmacyQualityV13Routes 读路由", () => {
  it("GET /api/v1/clinical-pharmacy-quality 路由存在且 auth:true", () => {
    const route = clinicalPharmacyQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/clinical-pharmacy-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
