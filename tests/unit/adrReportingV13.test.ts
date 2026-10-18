/**
 * 健澜科技 jlmedaios - 药品不良反应监测 V13 单测（M440-C，药事管理与药学服务组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAdrReportingCountV13,
  computeAdrReportingDisposalTimelinessRateV13,
  computeAdrReportingSeriousRateV13,
  type AdrReportingRecordV13,
} from "../../src/bff/aggregators/adrReportingV13Aggregator";
import { adrReportingV13Routes } from "../../src/bff/routes/adrReportingV13";

const records: AdrReportingRecordV13[] = [
  { seriousAdr: 50, totalAdr: 1000, timelyDisposal: 950 },
  { seriousAdr: 50, totalAdr: 1000, timelyDisposal: 950 },
];

describe("computeAdrReportingCountV13", () => {
  // 算式：records.length = 2 例（两条记录）
  it("ADR 上报例数 = 2 例（records.length 直接返回）", () => {
    expect(computeAdrReportingCountV13(records)).toBe(2);
  });
  it("空态 → 0", () => {
    expect(computeAdrReportingCountV13([])).toBe(0);
  });
});

describe("computeAdrReportingSeriousRateV13", () => {
  // 算式：(50+50)/(1000+1000)×100 = 100/2000×100 = 5.00
  it("严重 ADR 占比 = 5.00%", () => {
    expect(computeAdrReportingSeriousRateV13(records)).toBe(5.00);
  });
});

describe("computeAdrReportingDisposalTimelinessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("ADR 处置及时率 = 95.00%", () => {
    expect(computeAdrReportingDisposalTimelinessRateV13(records)).toBe(95.00);
  });
});

describe("adrReportingV13Routes 读路由", () => {
  it("GET /api/v1/adr-reporting 路由存在且 auth:true", () => {
    const route = adrReportingV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/adr-reporting",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
