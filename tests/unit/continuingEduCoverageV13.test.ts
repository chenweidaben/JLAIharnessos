/**
 * 健澜科技 jlmedaios - 继续教育（覆盖率）V13 单测（M361-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeContinuingEduCoverageRateV13,
  computeContinuingEduHoursCompletionRateV13,
  computeContinuingEduProjectPassRateV13,
  type ContinuingEduCoverageRecordV13,
} from "../../src/bff/aggregators/continuingEduCoverageV13Aggregator";
import { continuingEduCoverageV13Routes } from "../../src/bff/routes/continuingEduCoverageV13";

const records: ContinuingEduCoverageRecordV13[] = [
  { completedHours: 950, requiredHours: 1000, passedProjects: 48, attendedProjects: 50, coveredPersons: 480, requiredPersons: 500 },
  { completedHours: 950, requiredHours: 1000, passedProjects: 47, attendedProjects: 50, coveredPersons: 470, requiredPersons: 500 },
];

describe("computeContinuingEduHoursCompletionRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("继教学时完成率 = 95.00%", () => {
    expect(computeContinuingEduHoursCompletionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeContinuingEduHoursCompletionRateV13([])).toBe(0);
  });
});

describe("computeContinuingEduProjectPassRateV13", () => {
  // 算式：(48+47)/(50+50) = 95/100×100 = 95.00
  it("继教项目通过率 = 95.00%", () => {
    expect(computeContinuingEduProjectPassRateV13(records)).toBe(95.00);
  });
});

describe("computeContinuingEduCoverageRateV13", () => {
  // 算式：(480+470)/(500+500) = 950/1000×100 = 95.00
  it("继教覆盖率 = 95.00%", () => {
    expect(computeContinuingEduCoverageRateV13(records)).toBe(95.00);
  });
});

describe("continuingEduCoverageV13Routes 读路由", () => {
  it("GET /api/v1/continuing-edu-coverage 路由存在且 auth:true", () => {
    const route = continuingEduCoverageV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/continuing-edu-coverage",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
