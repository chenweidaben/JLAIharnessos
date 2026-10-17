/**
 * 健澜科技 jlmedaios - 学术水平 V13 单测（M403-D，M403 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeNationalAcademicSocietyPositionCountV13,
  computeNationalResearchProjectCountV13,
  computeSCIPaperCountV13,
  type AcademicLevelRecordV13,
} from "../../src/bff/aggregators/academicLevelV13Aggregator";
import { academicLevelV13Routes } from "../../src/bff/routes/academicLevelV13";

const records: AcademicLevelRecordV13[] = [
  { nationalPosition: 5, sciPaper: 10, nationalProject: 3 },
  { nationalPosition: 5, sciPaper: 10, nationalProject: 3 },
];

describe("computeNationalAcademicSocietyPositionCountV13", () => {
  // 算式：5+5 = 10
  it("国家级学会任职数 = 10 个", () => {
    expect(computeNationalAcademicSocietyPositionCountV13(records)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(computeNationalAcademicSocietyPositionCountV13([])).toBe(0);
  });
});

describe("computeSCIPaperCountV13", () => {
  // 算式：10+10 = 20
  it("SCI 论文数 = 20 篇", () => {
    expect(computeSCIPaperCountV13(records)).toBe(20);
  });
});

describe("computeNationalResearchProjectCountV13", () => {
  // 算式：3+3 = 6
  it("国家级课题立项数 = 6 项", () => {
    expect(computeNationalResearchProjectCountV13(records)).toBe(6);
  });
});

describe("academicLevelV13Routes 读路由", () => {
  it("GET /api/v1/academic-level 路由存在且 auth:true", () => {
    const route = academicLevelV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/academic-level",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
