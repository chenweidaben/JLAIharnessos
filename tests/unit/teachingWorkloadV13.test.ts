/**
 * 健澜科技 jlmedaios - 教学工作 V13 单测（M355-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAnnualTeachingHoursV13,
  computeAnnualTeachingVisitsV13,
  computeInternCountV13,
  type TeachingWorkloadRecordV13,
} from "../../src/bff/aggregators/teachingWorkloadV13Aggregator";
import { teachingWorkloadV13Routes } from "../../src/bff/routes/teachingWorkloadV13";

const records: TeachingWorkloadRecordV13[] = [
  { annualTeachingVisits: 200, internCount: 50, annualTeachingHours: 800 },
  { annualTeachingVisits: 300, internCount: 70, annualTeachingHours: 1200 },
];

describe("computeAnnualTeachingVisitsV13", () => {
  // 算式：200+300 = 500
  it("年度带教人次 = 500", () => {
    expect(computeAnnualTeachingVisitsV13(records)).toBe(500);
  });
  it("空态 → 0", () => {
    expect(computeAnnualTeachingVisitsV13([])).toBe(0);
  });
});

describe("computeInternCountV13", () => {
  // 算式：50+70 = 120
  it("在院实习进修生数 = 120", () => {
    expect(computeInternCountV13(records)).toBe(120);
  });
});

describe("computeAnnualTeachingHoursV13", () => {
  // 算式：800+1200 = 2000
  it("年度教学课时 = 2000", () => {
    expect(computeAnnualTeachingHoursV13(records)).toBe(2000);
  });
});

describe("teachingWorkloadV13Routes 读路由", () => {
  it("GET /api/v1/teaching-workload 路由存在且 auth:true", () => {
    const route = teachingWorkloadV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/teaching-workload",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
