/**
 * 健澜科技 jlmedaios - 学术交流统计 V13 单测（M383-D，stats 避让，M383 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAcademicConferenceCountV13,
  computeExpertVisitCountV13,
  computeOutgoingTrainingCountV13,
  type AcademicExchangeRecordV13,
} from "../../src/bff/aggregators/academicExchangeStatsV13Aggregator";
import { academicExchangeStatsV13Routes } from "../../src/bff/routes/academicExchangeStatsV13";

const records: AcademicExchangeRecordV13[] = [
  { conferenceCount: 10, outgoingTrainingCount: 30, expertVisitCount: 15 },
  { conferenceCount: 10, outgoingTrainingCount: 30, expertVisitCount: 15 },
];

describe("computeAcademicConferenceCountV13", () => {
  // 算式：10+10 = 20
  it("学术会议举办次数 = 20 次", () => {
    expect(computeAcademicConferenceCountV13(records)).toBe(20);
  });
  it("空态 → 0", () => {
    expect(computeAcademicConferenceCountV13([])).toBe(0);
  });
});

describe("computeOutgoingTrainingCountV13", () => {
  // 算式：30+30 = 60
  it("外出进修人次 = 60 人次", () => {
    expect(computeOutgoingTrainingCountV13(records)).toBe(60);
  });
});

describe("computeExpertVisitCountV13", () => {
  // 算式：15+15 = 30
  it("专家来院次数 = 30 次", () => {
    expect(computeExpertVisitCountV13(records)).toBe(30);
  });
});

describe("academicExchangeStatsV13Routes 读路由", () => {
  it("GET /api/v1/academic-exchange-stats 路由存在且 auth:true", () => {
    const route = academicExchangeStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/academic-exchange-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
