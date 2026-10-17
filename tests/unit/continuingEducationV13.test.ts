/**
 * 健澜科技 jlmedaios - 继续教育学分 V13 单测（M327-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDoctorCreditRateV13,
  countNationalProjectsV13,
  type EducationCreditV13,
} from "../../src/bff/aggregators/continuingEducationV13Aggregator";
import { continuingEducationV13Routes } from "../../src/bff/routes/continuingEducationV13";

const records: EducationCreditV13[] = [
  { doctorName: "张医生", isQualified: true, isNationalProject: true },
  { doctorName: "李医生", isQualified: true, isNationalProject: true },
  { doctorName: "王医生", isQualified: true, isNationalProject: true },
  { doctorName: "赵医生", isQualified: true, isNationalProject: false },
  { doctorName: "钱医生", isQualified: true, isNationalProject: false },
  { doctorName: "孙医生", isQualified: true, isNationalProject: false },
  { doctorName: "周医生", isQualified: true, isNationalProject: false },
  { doctorName: "吴医生", isQualified: true, isNationalProject: false },
  { doctorName: "郑医生", isQualified: false, isNationalProject: false },
  { doctorName: "王医生", isQualified: false, isNationalProject: false },
];

describe("computeDoctorCreditRateV13", () => {
  // 算式：8/10×100 = 80
  it("达标率 = 80%", () => {
    expect(computeDoctorCreditRateV13(records)).toBe(80);
  });
  it("空态达标率 → 0", () => {
    expect(computeDoctorCreditRateV13([])).toBe(0);
  });
});

describe("countNationalProjectsV13", () => {
  // 算式：3 个国家级项目
  it("国家级项目 = 3", () => {
    expect(countNationalProjectsV13(records)).toBe(3);
  });
  it("空态 → 0", () => {
    expect(countNationalProjectsV13([])).toBe(0);
  });
});

describe("continuingEducationV13Routes 读路由", () => {
  it("GET /api/v1/continuing-education 路由存在且 auth:true", () => {
    const route = continuingEducationV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/continuing-education",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
