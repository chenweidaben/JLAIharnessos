/**
 * 健澜科技 jlmedaios - 志愿者服务管理 V13 单测（M457-B，医院文化与公益管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeVolunteerServiceCoverageRateV13,
  computeVolunteerServiceHoursV13,
  computeVolunteerServiceRegisteredCountV13,
  type VolunteerServiceMgmtRecordV13,
} from "../../src/bff/aggregators/volunteerServiceMgmtV13Aggregator";
import { volunteerServiceMgmtV13Routes } from "../../src/bff/routes/volunteerServiceMgmtV13";

const records: VolunteerServiceMgmtRecordV13[] = [
  { registeredCount: 950, serviceHours: 900, covered: 980, totalDept: 1000 },
  { registeredCount: 950, serviceHours: 900, covered: 980, totalDept: 1000 },
];

describe("computeVolunteerServiceRegisteredCountV13", () => {
  // 算式：950 + 950 = 1900（reduce 累加）
  it("志愿者注册人数 = 1900 人（reduce 累加）", () => {
    expect(computeVolunteerServiceRegisteredCountV13(records)).toBe(1900);
  });
  it("空态 → 0", () => {
    expect(computeVolunteerServiceRegisteredCountV13([])).toBe(0);
  });
});

describe("computeVolunteerServiceHoursV13", () => {
  // 算式：900 + 900 = 1800（reduce 累加）
  it("志愿服务时长 = 1800 小时（reduce 累加）", () => {
    expect(computeVolunteerServiceHoursV13(records)).toBe(1800);
  });
});

describe("computeVolunteerServiceCoverageRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("志愿服务覆盖率 = 98.00%", () => {
    expect(computeVolunteerServiceCoverageRateV13(records)).toBe(98.00);
  });
});

describe("volunteerServiceMgmtV13Routes 读路由", () => {
  it("GET /api/v1/volunteer-service-mgmt 路由存在且 auth:true", () => {
    const route = volunteerServiceMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/volunteer-service-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
