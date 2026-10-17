/**
 * 健澜科技 jlmedaios - 护理服务明细 V13 单测（M405-D，M405 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHighQualityNursingServiceCoverageRateV13,
  computeNursingAssistantCertifiedRateV13,
  computeResponsibilityHolisticNursingCoverageRateV13,
  type NursingServiceDetailRecordV13,
} from "../../src/bff/aggregators/nursingServiceDetailV13Aggregator";
import { nursingServiceDetailV13Routes } from "../../src/bff/routes/nursingServiceDetailV13";

const records: NursingServiceDetailRecordV13[] = [
  { qualityCovered: 95, qualityShould: 100, respCovered: 98, respShould: 100, certified: 900, totalAssistant: 1000 },
  { qualityCovered: 95, qualityShould: 100, respCovered: 98, respShould: 100, certified: 900, totalAssistant: 1000 },
];

describe("computeHighQualityNursingServiceCoverageRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("优质护理服务覆盖率 = 95.00%", () => {
    expect(computeHighQualityNursingServiceCoverageRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeHighQualityNursingServiceCoverageRateV13([])).toBe(0);
  });
});

describe("computeResponsibilityHolisticNursingCoverageRateV13", () => {
  // 算式：(98+98)/(100+100) = 196/200×100 = 98.00
  it("责任制整体护理覆盖率 = 98.00%", () => {
    expect(computeResponsibilityHolisticNursingCoverageRateV13(records)).toBe(98.00);
  });
});

describe("computeNursingAssistantCertifiedRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("护理员持证上岗率 = 90.00%", () => {
    expect(computeNursingAssistantCertifiedRateV13(records)).toBe(90.00);
  });
});

describe("nursingServiceDetailV13Routes 读路由", () => {
  it("GET /api/v1/nursing-service-detail 路由存在且 auth:true", () => {
    const route = nursingServiceDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-service-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
