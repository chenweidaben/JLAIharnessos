/**
 * 健澜科技 jlmedaios - 护理服务管理 V13 单测（M453-D，M453 收官，护理管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeNursingBasicCareQualifiedRateV13,
  computeNursingClassifiedCareImplementationRateV13,
  computeNursingSatisfactionRateV13,
  type NursingServiceMgmtRecordV13,
} from "../../src/bff/aggregators/nursingServiceMgmtV13Aggregator";
import { nursingServiceMgmtV13Routes } from "../../src/bff/routes/nursingServiceMgmtV13";

const records: NursingServiceMgmtRecordV13[] = [
  { qualified: 950, totalCheck: 1000, inPlace: 900, totalClassified: 1000, satisfied: 980, totalSurvey: 1000 },
  { qualified: 950, totalCheck: 1000, inPlace: 900, totalClassified: 1000, satisfied: 980, totalSurvey: 1000 },
];

describe("computeNursingBasicCareQualifiedRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("基础护理合格率 = 95.00%", () => {
    expect(computeNursingBasicCareQualifiedRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeNursingBasicCareQualifiedRateV13([])).toBe(0);
  });
});

describe("computeNursingClassifiedCareImplementationRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("分级护理到位率 = 90.00%", () => {
    expect(computeNursingClassifiedCareImplementationRateV13(records)).toBe(90.00);
  });
});

describe("computeNursingSatisfactionRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("护理满意度 = 98.00%", () => {
    expect(computeNursingSatisfactionRateV13(records)).toBe(98.00);
  });
});

describe("nursingServiceMgmtV13Routes 读路由", () => {
  it("GET /api/v1/nursing-service-mgmt 路由存在且 auth:true", () => {
    const route = nursingServiceMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-service-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
