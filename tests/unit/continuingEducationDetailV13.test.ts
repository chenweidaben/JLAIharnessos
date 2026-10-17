/**
 * 健澜科技 jlmedaios - 继续教育明细 V13 单测（M397-D，M397 收官，避让旧版 continuingEducationV13/continuingEducationStatsV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeContinuingEducationCreditComplianceRateV13,
  computeContinuingEducationProjectCountV13,
  computeOutboundTrainingCountV13,
  type ContinuingEducationDetailRecordV13,
} from "../../src/bff/aggregators/continuingEducationDetailV13Aggregator";
import { continuingEducationDetailV13Routes } from "../../src/bff/routes/continuingEducationDetailV13";

const records: ContinuingEducationDetailRecordV13[] = [
  { projectCount: 10, compliantCount: 95, totalCount: 100, outboundCount: 5 },
  { projectCount: 10, compliantCount: 95, totalCount: 100, outboundCount: 5 },
];

describe("computeContinuingEducationProjectCountV13", () => {
  // 算式：10+10 = 20
  it("继教项目数 = 20 项", () => {
    expect(computeContinuingEducationProjectCountV13(records)).toBe(20);
  });
  it("空态 → 0", () => {
    expect(computeContinuingEducationProjectCountV13([])).toBe(0);
  });
});

describe("computeContinuingEducationCreditComplianceRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("继教学分达标率 = 95.00%", () => {
    expect(computeContinuingEducationCreditComplianceRateV13(records)).toBe(95.00);
  });
});

describe("computeOutboundTrainingCountV13", () => {
  // 算式：5+5 = 10
  it("外出进修人数 = 10 人", () => {
    expect(computeOutboundTrainingCountV13(records)).toBe(10);
  });
});

describe("continuingEducationDetailV13Routes 读路由", () => {
  it("GET /api/v1/continuing-education-detail 路由存在且 auth:true", () => {
    const route = continuingEducationDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/continuing-education-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
