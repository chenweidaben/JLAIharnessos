/**
 * 健澜科技 jlmedaios - 病理质量 V13 单测（M360-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeClinicalPathologyConsistencyRateV13,
  computeFrozenSectionTimelyRateV13,
  computePathologyReportTimelyRateV13,
  type PathologyQualityRecordV13,
} from "../../src/bff/aggregators/pathologyQualityV13Aggregator";
import { pathologyQualityV13Routes } from "../../src/bff/routes/pathologyQualityV13";

const records: PathologyQualityRecordV13[] = [
  { reportTimely: 95, reportCount: 100, consistencyPassed: 480, consistencyCount: 500, frozenTimely: 90, frozenCount: 100 },
  { reportTimely: 95, reportCount: 100, consistencyPassed: 470, consistencyCount: 500, frozenTimely: 90, frozenCount: 100 },
];

describe("computePathologyReportTimelyRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("病理报告及时率 = 95.00%", () => {
    expect(computePathologyReportTimelyRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computePathologyReportTimelyRateV13([])).toBe(0);
  });
});

describe("computeClinicalPathologyConsistencyRateV13", () => {
  // 算式：(480+470)/(500+500) = 950/1000×100 = 95.00
  it("临床与病理诊断符合率 = 95.00%", () => {
    expect(computeClinicalPathologyConsistencyRateV13(records)).toBe(95.00);
  });
});

describe("computeFrozenSectionTimelyRateV13", () => {
  // 算式：(90+90)/(100+100) = 180/200×100 = 90.00
  it("术中冰冻诊断及时率 = 90.00%", () => {
    expect(computeFrozenSectionTimelyRateV13(records)).toBe(90.00);
  });
});

describe("pathologyQualityV13Routes 读路由", () => {
  it("GET /api/v1/pathology-quality 路由存在且 auth:true", () => {
    const route = pathologyQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/pathology-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
