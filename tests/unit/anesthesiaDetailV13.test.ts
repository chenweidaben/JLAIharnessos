/**
 * 健澜科技 jlmedaios - 麻醉质量 V13 单测（M391-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAnesthesiaAdverseEventRateV13,
  computeAnesthesiaRecoveryTimeAvgV13,
  computeAnesthesiaStartTimeAvgV13,
  type AnesthesiaDetailRecordV13,
} from "../../src/bff/aggregators/anesthesiaDetailV13Aggregator";
import { anesthesiaDetailV13Routes } from "../../src/bff/routes/anesthesiaDetailV13";

const records: AnesthesiaDetailRecordV13[] = [
  { totalStartMinutes: 1500, totalRecoveryMinutes: 3000, anesthesiaCount: 100, recoveryCount: 100, adverseEventCount: 2 },
  { totalStartMinutes: 1500, totalRecoveryMinutes: 3000, anesthesiaCount: 100, recoveryCount: 100, adverseEventCount: 2 },
];

describe("computeAnesthesiaStartTimeAvgV13", () => {
  // 算式：(1500+1500)/(100+100) = 3000/200 = 15.00
  it("平均麻醉开始时长 = 15.00 分钟", () => {
    expect(computeAnesthesiaStartTimeAvgV13(records)).toBe(15.00);
  });
  it("空态 → 0", () => {
    expect(computeAnesthesiaStartTimeAvgV13([])).toBe(0);
  });
});

describe("computeAnesthesiaRecoveryTimeAvgV13", () => {
  // 算式：(3000+3000)/(100+100) = 6000/200 = 30.00
  it("平均麻醉苏醒时长 = 30.00 分钟", () => {
    expect(computeAnesthesiaRecoveryTimeAvgV13(records)).toBe(30.00);
  });
});

describe("computeAnesthesiaAdverseEventRateV13", () => {
  // 算式：(2+2)/(100+100)×100 = 4/200×100 = 2.00
  it("麻醉不良事件率 = 2.00%", () => {
    expect(computeAnesthesiaAdverseEventRateV13(records)).toBe(2.00);
  });
});

describe("anesthesiaDetailV13Routes 读路由", () => {
  it("GET /api/v1/anesthesia-detail 路由存在且 auth:true", () => {
    const route = anesthesiaDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/anesthesia-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
