/**
 * 健澜科技 jlmedaios - 公共关系 V13 单测（M398-D，M398 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCommunityHealthEducationCountV13,
  computeMediaPositiveReportCountV13,
  computeVolunteerServiceHoursV13,
  type PublicRelationRecordV13,
} from "../../src/bff/aggregators/publicRelationV13Aggregator";
import { publicRelationV13Routes } from "../../src/bff/routes/publicRelationV13";

const records: PublicRelationRecordV13[] = [
  { positiveReportCount: 10, volunteerHours: 100, healthEducationCount: 5 },
  { positiveReportCount: 10, volunteerHours: 100, healthEducationCount: 5 },
];

describe("computeMediaPositiveReportCountV13", () => {
  // 算式：10+10 = 20
  it("媒体正面报道数 = 20 篇", () => {
    expect(computeMediaPositiveReportCountV13(records)).toBe(20);
  });
  it("空态 → 0", () => {
    expect(computeMediaPositiveReportCountV13([])).toBe(0);
  });
});

describe("computeVolunteerServiceHoursV13", () => {
  // 算式：100+100 = 200
  it("志愿服务时长 = 200 小时", () => {
    expect(computeVolunteerServiceHoursV13(records)).toBe(200);
  });
});

describe("computeCommunityHealthEducationCountV13", () => {
  // 算式：5+5 = 10
  it("社区健康宣教次数 = 10 次", () => {
    expect(computeCommunityHealthEducationCountV13(records)).toBe(10);
  });
});

describe("publicRelationV13Routes 读路由", () => {
  it("GET /api/v1/public-relation 路由存在且 auth:true", () => {
    const route = publicRelationV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/public-relation",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
