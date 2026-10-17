/**
 * 健澜科技 jlmedaios - 临床路径管理（细节）V13 单测（M414-B，detail 避让旧版 clinicalPathwayMgmtV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeClinicalPathwayCompletionRateV13,
  computeClinicalPathwayEntryRateV13,
  computeClinicalPathwayVariationRateV13,
  type ClinicalPathwayDetailRecordV13,
} from "../../src/bff/aggregators/clinicalPathwayDetailV13Aggregator";
import { clinicalPathwayDetailV13Routes } from "../../src/bff/routes/clinicalPathwayDetailV13";

const records: ClinicalPathwayDetailRecordV13[] = [
  { entered: 950, shouldEnterTotal: 1000, completed: 900, enteredTotal: 950, variation: 50, pathwayTotal: 1000 },
  { entered: 950, shouldEnterTotal: 1000, completed: 900, enteredTotal: 950, variation: 50, pathwayTotal: 1000 },
];

describe("computeClinicalPathwayEntryRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("入径率 = 95.00%", () => {
    expect(computeClinicalPathwayEntryRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeClinicalPathwayEntryRateV13([])).toBe(0);
  });
});

describe("computeClinicalPathwayCompletionRateV13", () => {
  // 算式：(900+900)/(950+950)×100 = 1800/1900×100 = 94.74
  it("路径完成率 = 94.74%", () => {
    expect(computeClinicalPathwayCompletionRateV13(records)).toBe(94.74);
  });
});

describe("computeClinicalPathwayVariationRateV13", () => {
  // 算式：(50+50)/(1000+1000)×100 = 100/2000×100 = 5.00（反向指标，越低越好）
  it("变异率 = 5.00%（反向指标）", () => {
    expect(computeClinicalPathwayVariationRateV13(records)).toBe(5.00);
  });
});

describe("clinicalPathwayDetailV13Routes 读路由", () => {
  it("GET /api/v1/clinical-pathway-detail 路由存在且 auth:true", () => {
    const route = clinicalPathwayDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/clinical-pathway-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
