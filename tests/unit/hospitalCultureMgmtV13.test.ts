/**
 * 健澜科技 jlmedaios - 医院文化建设管理 V13 单测（M457-A，医院文化与公益管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHospitalCultureActivityParticipationRateV13,
  computeHospitalCultureEmployeeSatisfactionRateV13,
  computeHospitalCultureVenueOpenRateV13,
  type HospitalCultureMgmtRecordV13,
} from "../../src/bff/aggregators/hospitalCultureMgmtV13Aggregator";
import { hospitalCultureMgmtV13Routes } from "../../src/bff/routes/hospitalCultureMgmtV13";

const records: HospitalCultureMgmtRecordV13[] = [
  { participated: 950, totalEmployee: 1000, satisfied: 900, totalSurvey: 1000, opened: 980, totalVenue: 1000 },
  { participated: 950, totalEmployee: 1000, satisfied: 900, totalSurvey: 1000, opened: 980, totalVenue: 1000 },
];

describe("computeHospitalCultureActivityParticipationRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("文化活动参与率 = 95.00%", () => {
    expect(computeHospitalCultureActivityParticipationRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeHospitalCultureActivityParticipationRateV13([])).toBe(0);
  });
});

describe("computeHospitalCultureEmployeeSatisfactionRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("员工文化满意度 = 90.00%", () => {
    expect(computeHospitalCultureEmployeeSatisfactionRateV13(records)).toBe(90.00);
  });
});

describe("computeHospitalCultureVenueOpenRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("文化阵地开放率 = 98.00%", () => {
    expect(computeHospitalCultureVenueOpenRateV13(records)).toBe(98.00);
  });
});

describe("hospitalCultureMgmtV13Routes 读路由", () => {
  it("GET /api/v1/hospital-culture-mgmt 路由存在且 auth:true", () => {
    const route = hospitalCultureMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/hospital-culture-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
