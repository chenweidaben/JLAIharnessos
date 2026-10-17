/**
 * 健澜科技 jlmedaios - 住培管理统计 V13 单测（M383-C，stats 避让）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeGraduationExamPassRateV13,
  computeResidentInTrainingCountV13,
  computeResidentSatisfactionRateV13,
  type ResidentTrainingRecordV13,
} from "../../src/bff/aggregators/residentTrainingStatsV13Aggregator";
import { residentTrainingStatsV13Routes } from "../../src/bff/routes/residentTrainingStatsV13";

const records: ResidentTrainingRecordV13[] = [
  { residentCount: 100, passCount: 950, examCount: 1000, satisfactionCount: 900, surveyCount: 1000 },
  { residentCount: 100, passCount: 950, examCount: 1000, satisfactionCount: 900, surveyCount: 1000 },
];

describe("computeResidentInTrainingCountV13", () => {
  // 算式：100+100 = 200
  it("在培住培医师数 = 200 人", () => {
    expect(computeResidentInTrainingCountV13(records)).toBe(200);
  });
  it("空态 → 0", () => {
    expect(computeResidentInTrainingCountV13([])).toBe(0);
  });
});

describe("computeGraduationExamPassRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("结业考核通过率 = 95.00%", () => {
    expect(computeGraduationExamPassRateV13(records)).toBe(95.00);
  });
});

describe("computeResidentSatisfactionRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("住培满意度 = 90.00%", () => {
    expect(computeResidentSatisfactionRateV13(records)).toBe(90.00);
  });
});

describe("residentTrainingStatsV13Routes 读路由", () => {
  it("GET /api/v1/resident-training-stats 路由存在且 auth:true", () => {
    const route = residentTrainingStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/resident-training-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
