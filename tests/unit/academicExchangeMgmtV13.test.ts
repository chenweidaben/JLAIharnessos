/**
 * 健澜科技 jlmedaios - 学术交流管理 V13 单测（M456-C，学科建设与科研管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAcademicExchangeActivityCountV13,
  computeAcademicExchangeAttendeeCountV13,
  computeAcademicExchangeContinuingEducationCountV13,
  type AcademicExchangeMgmtRecordV13,
} from "../../src/bff/aggregators/academicExchangeMgmtV13Aggregator";
import { academicExchangeMgmtV13Routes } from "../../src/bff/routes/academicExchangeMgmtV13";

const records: AcademicExchangeMgmtRecordV13[] = [
  { activityCount: 950, attendeeCount: 900, continuingEduCount: 980 },
  { activityCount: 950, attendeeCount: 900, continuingEduCount: 980 },
];

describe("computeAcademicExchangeActivityCountV13", () => {
  // 算式：950 + 950 = 1900（reduce 累加）
  it("学术活动举办次数 = 1900 次（reduce 累加）", () => {
    expect(computeAcademicExchangeActivityCountV13(records)).toBe(1900);
  });
  it("空态 → 0", () => {
    expect(computeAcademicExchangeActivityCountV13([])).toBe(0);
  });
});

describe("computeAcademicExchangeAttendeeCountV13", () => {
  // 算式：900 + 900 = 1800（reduce 累加）
  it("外出参会人次 = 1800 人次（reduce 累加）", () => {
    expect(computeAcademicExchangeAttendeeCountV13(records)).toBe(1800);
  });
});

describe("computeAcademicExchangeContinuingEducationCountV13", () => {
  // 算式：980 + 980 = 1960（reduce 累加）
  it("主办继教项目数 = 1960 项（reduce 累加）", () => {
    expect(computeAcademicExchangeContinuingEducationCountV13(records)).toBe(1960);
  });
});

describe("academicExchangeMgmtV13Routes 读路由", () => {
  it("GET /api/v1/academic-exchange-mgmt 路由存在且 auth:true", () => {
    const route = academicExchangeMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/academic-exchange-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
