/**
 * 健澜科技 jlmedaios - 检验质量 V13 单测（M360-A，新规格）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeExternalQcPassRateV13,
  computeInternalQcPassRateV13,
  computeLabReportTimelyRateV13,
  type LabQualityRecordV13,
} from "../../src/bff/aggregators/labQualityV13Aggregator";
import { labQualityV13Routes } from "../../src/bff/routes/labQualityV13";

const records: LabQualityRecordV13[] = [
  { internalQcPassed: 480, internalQcCount: 500, externalQcPassed: 90, externalQcCount: 100, reportTimely: 950, reportCount: 1000 },
  { internalQcPassed: 470, internalQcCount: 500, externalQcPassed: 90, externalQcCount: 100, reportTimely: 940, reportCount: 1000 },
];

describe("computeInternalQcPassRateV13", () => {
  // 算式：(480+470)/(500+500) = 950/1000×100 = 95.00
  it("室内质控合格率 = 95.00%", () => {
    expect(computeInternalQcPassRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeInternalQcPassRateV13([])).toBe(0);
  });
});

describe("computeExternalQcPassRateV13", () => {
  // 算式：(90+90)/(100+100) = 180/200×100 = 90.00
  it("室间质评合格率 = 90.00%", () => {
    expect(computeExternalQcPassRateV13(records)).toBe(90.00);
  });
});

describe("computeLabReportTimelyRateV13", () => {
  // 算式：(950+940)/(1000+1000) = 1890/2000×100 = 94.50
  it("检验报告及时率 = 94.50%", () => {
    expect(computeLabReportTimelyRateV13(records)).toBe(94.50);
  });
});

describe("labQualityV13Routes 读路由", () => {
  it("GET /api/v1/lab-quality 路由存在且 auth:true", () => {
    const route = labQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/lab-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
