/**
 * 健澜科技 jlmedaios - 护理安全 V13 单测（M369-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFallRateV13,
  computeNursingAdverseEventCountV13,
  computePressureUlcerRateV13,
  type NursingSafetyRecordV13,
} from "../../src/bff/aggregators/nursingSafetyV13Aggregator";
import { nursingSafetyV13Routes } from "../../src/bff/routes/nursingSafetyV13";

const records: NursingSafetyRecordV13[] = [
  { adverseEventCount: 5, inpatientCount: 1000, pressureUlcerCount: 2, fallCount: 3 },
  { adverseEventCount: 5, inpatientCount: 1000, pressureUlcerCount: 2, fallCount: 3 },
];

describe("computeNursingAdverseEventCountV13", () => {
  // 算式：5+5 = 10
  it("护理不良事件数 = 10", () => {
    expect(computeNursingAdverseEventCountV13(records)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(computeNursingAdverseEventCountV13([])).toBe(0);
  });
});

describe("computePressureUlcerRateV13", () => {
  // 算式：(2+2)/(1000+1000) = 4/2000×100 = 0.20
  it("压疮发生率 = 0.20%", () => {
    expect(computePressureUlcerRateV13(records)).toBe(0.20);
  });
});

describe("computeFallRateV13", () => {
  // 算式：(3+3)/(1000+1000) = 6/2000×100 = 0.30
  it("跌倒发生率 = 0.30%", () => {
    expect(computeFallRateV13(records)).toBe(0.30);
  });
});

describe("nursingSafetyV13Routes 读路由", () => {
  it("GET /api/v1/nursing-safety 路由存在且 auth:true", () => {
    const route = nursingSafetyV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-safety",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
