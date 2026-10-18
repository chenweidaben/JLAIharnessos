/**
 * 健澜科技 jlmedaios - 健康宣教管理（统计视角）V13 单测（M457-C，医院文化与公益管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHealthEducationStatsConsultationCountV13,
  computeHealthEducationStatsLectureCountV13,
  computeHealthEducationStatsMaterialDistributionCountV13,
  type HealthEducationStatsMgmtRecordV13,
} from "../../src/bff/aggregators/healthEducationStatsMgmtV13Aggregator";
import { healthEducationStatsMgmtV13Routes } from "../../src/bff/routes/healthEducationStatsMgmtV13";

const records: HealthEducationStatsMgmtRecordV13[] = [
  { lectureCount: 950, materialCount: 900, consultationCount: 980 },
  { lectureCount: 950, materialCount: 900, consultationCount: 980 },
];

describe("computeHealthEducationStatsLectureCountV13", () => {
  // 算式：950 + 950 = 1900（reduce 累加）
  it("健康讲座场次 = 1900 场（reduce 累加）", () => {
    expect(computeHealthEducationStatsLectureCountV13(records)).toBe(1900);
  });
  it("空态 → 0", () => {
    expect(computeHealthEducationStatsLectureCountV13([])).toBe(0);
  });
});

describe("computeHealthEducationStatsMaterialDistributionCountV13", () => {
  // 算式：900 + 900 = 1800（reduce 累加）
  it("宣教材料发放量 = 1800 份（reduce 累加）", () => {
    expect(computeHealthEducationStatsMaterialDistributionCountV13(records)).toBe(1800);
  });
});

describe("computeHealthEducationStatsConsultationCountV13", () => {
  // 算式：980 + 980 = 1960（reduce 累加）
  it("健康咨询人次 = 1960 人次（reduce 累加）", () => {
    expect(computeHealthEducationStatsConsultationCountV13(records)).toBe(1960);
  });
});

describe("healthEducationStatsMgmtV13Routes 读路由", () => {
  it("GET /api/v1/health-education-stats-mgmt 路由存在且 auth:true", () => {
    const route = healthEducationStatsMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/health-education-stats-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
