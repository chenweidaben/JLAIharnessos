/**
 * 健澜科技 jlmedaios - 药品不良反应 V13 单测（M336-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeADRTotalCountV13,
  computeSeriousADRRateV13,
  computeTimelyReportRateV13,
  type ADRRecordV13,
} from "../../src/bff/aggregators/adverseDrugEventV13Aggregator";
import { adverseDrugEventV13Routes } from "../../src/bff/routes/adverseDrugEventV13";

const records: ADRRecordV13[] = [
  { totalCount: 50, seriousCount: 5, timelyReportedCount: 45 },
];

describe("computeADRTotalCountV13", () => {
  // 算式：50
  it("ADR 总数 = 50", () => {
    expect(computeADRTotalCountV13(records)).toBe(50);
  });
  it("空态 → 0", () => {
    expect(computeADRTotalCountV13([])).toBe(0);
  });
});

describe("computeSeriousADRRateV13", () => {
  // 算式：5/50×100 = 10
  it("严重 ADR 占比 = 10%", () => {
    expect(computeSeriousADRRateV13(records)).toBe(10);
  });
});

describe("computeTimelyReportRateV13", () => {
  // 算式：45/50×100 = 90
  it("上报及时率 = 90%", () => {
    expect(computeTimelyReportRateV13(records)).toBe(90);
  });
});

describe("adverseDrugEventV13Routes 读路由", () => {
  it("GET /api/v1/adverse-drug-event 路由存在且 auth:true", () => {
    const route = adverseDrugEventV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/adverse-drug-event",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
