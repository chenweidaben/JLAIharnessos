/**
 * 健澜科技 jlmedaios - 导医服务 V13 单测（M378-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAccessibilityServiceCountV13,
  computeGuideServiceCountV13,
  computeTriageAccuracyRateV13,
  type GuideServiceRecordV13,
} from "../../src/bff/aggregators/guideServiceV13Aggregator";
import { guideServiceV13Routes } from "../../src/bff/routes/guideServiceV13";

const records: GuideServiceRecordV13[] = [
  { guideServiceCount: 500, triageTotalCount: 100, triageAccurateCount: 98, accessibilityServiceCount: 100 },
  { guideServiceCount: 500, triageTotalCount: 100, triageAccurateCount: 98, accessibilityServiceCount: 100 },
];

describe("computeGuideServiceCountV13", () => {
  // 算式：500+500 = 1000
  it("导医服务人次 = 1000", () => {
    expect(computeGuideServiceCountV13(records)).toBe(1000);
  });
  it("空态 → 0", () => {
    expect(computeGuideServiceCountV13([])).toBe(0);
  });
});

describe("computeTriageAccuracyRateV13", () => {
  // 算式：(98+98)/(100+100) = 196/200×100 = 98.00
  it("分诊准确率 = 98.00%", () => {
    expect(computeTriageAccuracyRateV13(records)).toBe(98.00);
  });
});

describe("computeAccessibilityServiceCountV13", () => {
  // 算式：100+100 = 200
  it("无障碍服务人次 = 200", () => {
    expect(computeAccessibilityServiceCountV13(records)).toBe(200);
  });
});

describe("guideServiceV13Routes 读路由", () => {
  it("GET /api/v1/guide-service 路由存在且 auth:true", () => {
    const route = guideServiceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/guide-service",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
