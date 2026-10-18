/**
 * 健澜科技 jlmedaios - 护理质量管理 V13 单测（M453-A，护理管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeNursingDocumentWritingQualifiedRateV13,
  computeNursingMeasureImplementationRateV13,
  computeNursingQualityControlQualifiedRateV13,
  type NursingQualityMgmtRecordV13,
} from "../../src/bff/aggregators/nursingQualityMgmtV13Aggregator";
import { nursingQualityMgmtV13Routes } from "../../src/bff/routes/nursingQualityMgmtV13";

const records: NursingQualityMgmtRecordV13[] = [
  { qualified: 950, totalCheck: 1000, implemented: 900, totalMeasure: 1000, qualifiedDoc: 980, totalDocument: 1000 },
  { qualified: 950, totalCheck: 1000, implemented: 900, totalMeasure: 1000, qualifiedDoc: 980, totalDocument: 1000 },
];

describe("computeNursingQualityControlQualifiedRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("护理质控合格率 = 95.00%", () => {
    expect(computeNursingQualityControlQualifiedRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeNursingQualityControlQualifiedRateV13([])).toBe(0);
  });
});

describe("computeNursingMeasureImplementationRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("护理措施落实率 = 90.00%", () => {
    expect(computeNursingMeasureImplementationRateV13(records)).toBe(90.00);
  });
});

describe("computeNursingDocumentWritingQualifiedRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("护理文书书写合格率 = 98.00%", () => {
    expect(computeNursingDocumentWritingQualifiedRateV13(records)).toBe(98.00);
  });
});

describe("nursingQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/nursing-quality-mgmt 路由存在且 auth:true", () => {
    const route = nursingQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
