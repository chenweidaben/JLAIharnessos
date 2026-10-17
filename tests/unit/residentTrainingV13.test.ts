/**
 * 健澜科技 jlmedaios - 住院医师规范化培训 V13 单测（M343-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeGraduationPassRateV13,
  computeMentorCountV13,
  computeResidentCountV13,
  type ResidentTrainingRecordV13,
} from "../../src/bff/aggregators/residentTrainingV13Aggregator";
import { residentTrainingV13Routes } from "../../src/bff/routes/residentTrainingV13";

const records: ResidentTrainingRecordV13[] = [
  { residentCount: 30, graduationTotal: 30, graduationPassed: 27, mentorCount: 10 },
  { residentCount: 20, graduationTotal: 20, graduationPassed: 18, mentorCount: 5 },
];

describe("computeResidentCountV13", () => {
  // 算式：30+20 = 50
  it("在培人数 = 50", () => {
    expect(computeResidentCountV13(records)).toBe(50);
  });
  it("空态 → 0", () => {
    expect(computeResidentCountV13([])).toBe(0);
  });
});

describe("computeGraduationPassRateV13", () => {
  // 算式：(27+18)/((30+20)) = 45/50×100 = 90.0
  it("结业考核通过率 = 90.0%", () => {
    expect(computeGraduationPassRateV13(records)).toBe(90.0);
  });
});

describe("computeMentorCountV13", () => {
  // 算式：10+5 = 15
  it("带教老师数 = 15", () => {
    expect(computeMentorCountV13(records)).toBe(15);
  });
});

describe("residentTrainingV13Routes 读路由", () => {
  it("GET /api/v1/resident-training 路由存在且 auth:true", () => {
    const route = residentTrainingV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/resident-training",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
