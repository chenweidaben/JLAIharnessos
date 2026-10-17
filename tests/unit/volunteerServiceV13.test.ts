/**
 * 健澜科技 jlmedaios - 志愿服务 V13 单测（M378-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeVolunteerServiceCountV13,
  computeVolunteerServiceHoursV13,
  computeVolunteerServiceSatisfactionRateV13,
  type VolunteerServiceRecordV13,
} from "../../src/bff/aggregators/volunteerServiceV13Aggregator";
import { volunteerServiceV13Routes } from "../../src/bff/routes/volunteerServiceV13";

const records: VolunteerServiceRecordV13[] = [
  { volunteerServiceCount: 400, volunteerHours: 500, satisfactionCount: 380 },
  { volunteerServiceCount: 400, volunteerHours: 500, satisfactionCount: 380 },
];

describe("computeVolunteerServiceCountV13", () => {
  // 算式：400+400 = 800
  it("志愿服务人次 = 800", () => {
    expect(computeVolunteerServiceCountV13(records)).toBe(800);
  });
  it("空态 → 0", () => {
    expect(computeVolunteerServiceCountV13([])).toBe(0);
  });
});

describe("computeVolunteerServiceHoursV13", () => {
  // 算式：500+500 = 1000
  it("志愿服务总时长 = 1000 小时", () => {
    expect(computeVolunteerServiceHoursV13(records)).toBe(1000);
  });
});

describe("computeVolunteerServiceSatisfactionRateV13", () => {
  // 算式：(380+380)/(400+400) = 760/800×100 = 95.00
  it("服务满意度 = 95.00%", () => {
    expect(computeVolunteerServiceSatisfactionRateV13(records)).toBe(95.00);
  });
});

describe("volunteerServiceV13Routes 读路由", () => {
  it("GET /api/v1/volunteer-service 路由存在且 auth:true", () => {
    const route = volunteerServiceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/volunteer-service",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
