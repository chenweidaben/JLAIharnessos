/**
 * 健澜科技 jlmedaios - 药品不良反应 V13 单测（M368-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAdrReportCountV13,
  computeAdrReportTimelyRateV13,
  computeSeriousAdrCountV13,
  type DrugAdverseReactionRecordV13,
} from "../../src/bff/aggregators/drugAdverseReactionV13Aggregator";
import { drugAdverseReactionV13Routes } from "../../src/bff/routes/drugAdverseReactionV13";

const records: DrugAdverseReactionRecordV13[] = [
  { adrReportCount: 100, seriousAdrCount: 10, timelyReportCount: 95 },
  { adrReportCount: 100, seriousAdrCount: 10, timelyReportCount: 95 },
];

describe("computeAdrReportCountV13", () => {
  // 算式：100+100 = 200
  it("ADR 报告数 = 200", () => {
    expect(computeAdrReportCountV13(records)).toBe(200);
  });
  it("空态 → 0", () => {
    expect(computeAdrReportCountV13([])).toBe(0);
  });
});

describe("computeSeriousAdrCountV13", () => {
  // 算式：10+10 = 20
  it("严重 ADR 数 = 20", () => {
    expect(computeSeriousAdrCountV13(records)).toBe(20);
  });
});

describe("computeAdrReportTimelyRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("ADR 报告及时率 = 95.00%", () => {
    expect(computeAdrReportTimelyRateV13(records)).toBe(95.00);
  });
});

describe("drugAdverseReactionV13Routes 读路由", () => {
  it("GET /api/v1/drug-adverse-reaction 路由存在且 auth:true", () => {
    const route = drugAdverseReactionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/drug-adverse-reaction",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
