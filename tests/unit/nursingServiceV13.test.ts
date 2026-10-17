/**
 * 健澜科技 jlmedaios - 护理服务 V13 单测（M376-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBasicNursingPassRateV13,
  computeFirstLevelNursingCountV13,
  computeSpecialNursingCountV13,
  type NursingServiceRecordV13,
} from "../../src/bff/aggregators/nursingServiceV13Aggregator";
import { nursingServiceV13Routes } from "../../src/bff/routes/nursingServiceV13";

const records: NursingServiceRecordV13[] = [
  { basicNursingCheckCount: 100, basicNursingPassCount: 95, specialNursingCount: 50, firstLevelNursingCount: 200 },
  { basicNursingCheckCount: 100, basicNursingPassCount: 95, specialNursingCount: 50, firstLevelNursingCount: 200 },
];

describe("computeBasicNursingPassRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("基础护理合格率 = 95.00%", () => {
    expect(computeBasicNursingPassRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeBasicNursingPassRateV13([])).toBe(0);
  });
});

describe("computeSpecialNursingCountV13", () => {
  // 算式：50+50 = 100
  it("特级护理人次 = 100", () => {
    expect(computeSpecialNursingCountV13(records)).toBe(100);
  });
});

describe("computeFirstLevelNursingCountV13", () => {
  // 算式：200+200 = 400
  it("一级护理人次 = 400", () => {
    expect(computeFirstLevelNursingCountV13(records)).toBe(400);
  });
});

describe("nursingServiceV13Routes 读路由", () => {
  it("GET /api/v1/nursing-service 路由存在且 auth:true", () => {
    const route = nursingServiceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-service",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
