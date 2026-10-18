/**
 * 健澜科技 jlmedaios - 行业作风建设质量管理 V13 单测（M438-D，M438 收官，行风廉洁与职业道德建设组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeIndustryStyleComplaintDeclineRateV13,
  computeIndustryStyleNinePrinciplesAwarenessRateV13,
  computeIndustryStyleSatisfactionRateV13,
  type IndustryStyleQualityMgmtRecordV13,
} from "../../src/bff/aggregators/industryStyleQualityMgmtV13Aggregator";
import { industryStyleQualityMgmtV13Routes } from "../../src/bff/routes/industryStyleQualityMgmtV13";

const records: IndustryStyleQualityMgmtRecordV13[] = [
  { satisfiedPatients: 920, surveyedPatients: 1000, awareStaff: 950, totalStaff: 1000, lastComplaints: 1000, currentComplaints: 900 },
  { satisfiedPatients: 920, surveyedPatients: 1000, awareStaff: 950, totalStaff: 1000, lastComplaints: 1000, currentComplaints: 900 },
];

describe("computeIndustryStyleSatisfactionRateV13", () => {
  // 算式：(920+920)/(1000+1000)×100 = 1840/2000×100 = 92.00
  it("作风满意度 = 92.00%", () => {
    expect(computeIndustryStyleSatisfactionRateV13(records)).toBe(92.00);
  });
  it("空态 → 0", () => {
    expect(computeIndustryStyleSatisfactionRateV13([])).toBe(0);
  });
});

describe("computeIndustryStyleNinePrinciplesAwarenessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("九项准则知晓率 = 95.00%", () => {
    expect(computeIndustryStyleNinePrinciplesAwarenessRateV13(records)).toBe(95.00);
  });
});

describe("computeIndustryStyleComplaintDeclineRateV13", () => {
  // 算式：(2000-1800)/2000×100 = 200/2000×100 = 10.00（正向，越高越好）
  it("行风投诉下降率 = 10.00%（正向，越高越好）", () => {
    expect(computeIndustryStyleComplaintDeclineRateV13(records)).toBe(10.00);
  });
});

describe("industryStyleQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/industry-style-quality-mgmt 路由存在且 auth:true", () => {
    const route = industryStyleQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/industry-style-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
