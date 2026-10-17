/**
 * 健澜科技 jlmedaios - 教学医院指标 V13 单测（M327-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  countInternMentorsV13,
  countTeachingHoursV13,
  countTeachingRoundsV13,
  type TeachingRecordV13,
} from "../../src/bff/aggregators/teachingHospitalV13Aggregator";
import { teachingHospitalV13Routes } from "../../src/bff/routes/teachingHospitalV13";

const records: TeachingRecordV13[] = [
  { teacherName: "张教授", mentorCount: 2, teachingHours: 20, teachingRounds: 2 },
  { teacherName: "李教授", mentorCount: 3, teachingHours: 30, teachingRounds: 2 },
  { teacherName: "王教授", mentorCount: 1, teachingHours: 40, teachingRounds: 1 },
];

describe("countInternMentorsV13", () => {
  // 算式：2+3+1 = 6
  it("带教人数 = 6", () => {
    expect(countInternMentorsV13(records)).toBe(6);
  });
  it("空态 → 0", () => {
    expect(countInternMentorsV13([])).toBe(0);
  });
});

describe("countTeachingHoursV13", () => {
  // 算式：20+30+40 = 90
  it("教学课时 = 90 小时", () => {
    expect(countTeachingHoursV13(records)).toBe(90);
  });
});

describe("countTeachingRoundsV13", () => {
  // 算式：2+2+1 = 5
  it("教学查房 = 5 次", () => {
    expect(countTeachingRoundsV13(records)).toBe(5);
  });
});

describe("teachingHospitalV13Routes 读路由", () => {
  it("GET /api/v1/teaching-hospital 路由存在且 auth:true", () => {
    const route = teachingHospitalV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/teaching-hospital",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
