/**
 * 健澜科技 jlmedaios - 卒中中心 V13 单测（M348-D，M348 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDNTMinutesV13,
  computeIVThrombolysisRateV13,
  computeThrombectomyRateV13,
  type StrokeCenterRecordV13,
} from "../../src/bff/aggregators/strokeCenterV13Aggregator";
import { strokeCenterV13Routes } from "../../src/bff/routes/strokeCenterV13";

const records: StrokeCenterRecordV13[] = [
  { dntMinutes: 40, ivThrombolysisCount: 15, strokeTotalCount: 50, thrombectomyCount: 5 },
  { dntMinutes: 50, ivThrombolysisCount: 15, strokeTotalCount: 50, thrombectomyCount: 5 },
];

describe("computeDNTMinutesV13", () => {
  // 算式：(40+50)/2 = 45.0
  it("DNT 时间 = 45.0 分钟", () => {
    expect(computeDNTMinutesV13(records)).toBe(45.0);
  });
  it("空态 → 0", () => {
    expect(computeDNTMinutesV13([])).toBe(0);
  });
});

describe("computeIVThrombolysisRateV13", () => {
  // 算式：(15+15)/(50+50) = 30/100×100 = 30.00
  it("静脉溶栓率 = 30.00%", () => {
    expect(computeIVThrombolysisRateV13(records)).toBe(30.00);
  });
});

describe("computeThrombectomyRateV13", () => {
  // 算式：(5+5)/(50+50) = 10/100×100 = 10.00
  it("取栓率 = 10.00%", () => {
    expect(computeThrombectomyRateV13(records)).toBe(10.00);
  });
});

describe("strokeCenterV13Routes 读路由", () => {
  it("GET /api/v1/stroke-center 路由存在且 auth:true", () => {
    const route = strokeCenterV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/stroke-center",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
