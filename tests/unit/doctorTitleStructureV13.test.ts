/**
 * 健澜科技 jlmedaios - 医师职称结构 V13 单测（M346-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAssociateProfessorCountV13,
  computeAttendingCountV13,
  computeProfessorCountV13,
  computeResidentDoctorCountV13,
  type DoctorTitleRecordV13,
} from "../../src/bff/aggregators/doctorTitleStructureV13Aggregator";
import { doctorTitleStructureV13Routes } from "../../src/bff/routes/doctorTitleStructureV13";

const records: DoctorTitleRecordV13[] = [
  { professorCount: 2, associateProfessorCount: 5, attendingCount: 10, residentDoctorCount: 20 },
  { professorCount: 3, associateProfessorCount: 5, attendingCount: 10, residentDoctorCount: 20 },
];

describe("computeProfessorCountV13", () => {
  // 算式：2+3 = 5
  it("正高人数 = 5", () => {
    expect(computeProfessorCountV13(records)).toBe(5);
  });
});

describe("computeAssociateProfessorCountV13", () => {
  // 算式：5+5 = 10
  it("副高人数 = 10", () => {
    expect(computeAssociateProfessorCountV13(records)).toBe(10);
  });
});

describe("computeAttendingCountV13", () => {
  // 算式：10+10 = 20
  it("中级人数 = 20", () => {
    expect(computeAttendingCountV13(records)).toBe(20);
  });
});

describe("computeResidentDoctorCountV13", () => {
  // 算式：20+20 = 40
  it("初级人数 = 40", () => {
    expect(computeResidentDoctorCountV13(records)).toBe(40);
  });
});

describe("doctorTitleStructureV13Routes 读路由", () => {
  it("GET /api/v1/doctor-title-structure 路由存在且 auth:true", () => {
    const route = doctorTitleStructureV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/doctor-title-structure",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
