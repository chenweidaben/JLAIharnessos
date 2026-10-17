/**
 * 健澜科技 jlmedaios - 学术交流 V13 单测（M361-D，M361 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAcademicConferenceCountV13,
  computeAcademicPositionCountV13,
  computePublishedPaperCountV13,
  type AcademicExchangeRecordV13,
} from "../../src/bff/aggregators/academicExchangeV13Aggregator";
import { academicExchangeV13Routes } from "../../src/bff/routes/academicExchangeV13";

const records: AcademicExchangeRecordV13[] = [
  { conferenceCount: 3, paperCount: 15, academicPositionCount: 10 },
  { conferenceCount: 2, paperCount: 15, academicPositionCount: 10 },
];

describe("computeAcademicConferenceCountV13", () => {
  // 算式：3+2 = 5
  it("主办学术会议次数 = 5", () => {
    expect(computeAcademicConferenceCountV13(records)).toBe(5);
  });
  it("空态 → 0", () => {
    expect(computeAcademicConferenceCountV13([])).toBe(0);
  });
});

describe("computePublishedPaperCountV13", () => {
  // 算式：15+15 = 30
  it("发表论文数 = 30", () => {
    expect(computePublishedPaperCountV13(records)).toBe(30);
  });
});

describe("computeAcademicPositionCountV13", () => {
  // 算式：10+10 = 20
  it("学术任职人数 = 20", () => {
    expect(computeAcademicPositionCountV13(records)).toBe(20);
  });
});

describe("academicExchangeV13Routes 读路由", () => {
  it("GET /api/v1/academic-exchange 路由存在且 auth:true", () => {
    const route = academicExchangeV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/academic-exchange",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
