/**
 * 健澜科技 jlmedaios - 临床路径管理 V13 单测（M421-D，M421 收官，换名避让旧版 clinicalPathwayDetailV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeClinicalPathwayCompletionRateV13,
  computeClinicalPathwayEnrollmentRateV13,
  computeClinicalPathwayVariationRateV13,
  type ClinicalPathwayMgmtRecordV13,
} from "../../src/bff/aggregators/clinicalPathwayMgmtV13Aggregator";
import { clinicalPathwayMgmtV13Routes } from "../../src/bff/routes/clinicalPathwayMgmtV13";

const records: ClinicalPathwayMgmtRecordV13[] = [
  { enrolled: 95, shouldEnroll: 100, completed: 90, variation: 5 },
  { enrolled: 95, shouldEnroll: 100, completed: 90, variation: 5 },
];

describe("computeClinicalPathwayEnrollmentRateV13", () => {
  // 算式：(95+95)/(100+100)×100 = 190/200×100 = 95.00
  it("临床路径入径率 = 95.00%", () => {
    expect(computeClinicalPathwayEnrollmentRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeClinicalPathwayEnrollmentRateV13([])).toBe(0);
  });
});

describe("computeClinicalPathwayCompletionRateV13", () => {
  // 算式：(90+90)/(95+95)×100 = 180/190×100 = 94.74
  it("临床路径完成率 = 94.74%", () => {
    expect(computeClinicalPathwayCompletionRateV13(records)).toBe(94.74);
  });
});

describe("computeClinicalPathwayVariationRateV13", () => {
  // 算式：(5+5)/(95+95)×100 = 10/190×100 = 5.26（反向指标，越低越好）
  it("临床路径变异率 = 5.26%（反向指标）", () => {
    expect(computeClinicalPathwayVariationRateV13(records)).toBe(5.26);
  });
});

describe("clinicalPathwayMgmtV13Routes 读路由", () => {
  it("GET /api/v1/clinical-pathway-mgmt 路由存在且 auth:true", () => {
    const route = clinicalPathwayMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/clinical-pathway-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
