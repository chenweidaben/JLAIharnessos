/**
 * 健澜科技 jlmedaios - 麻醉相关并发症 V13 单测（M339-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeSevereComplicationRateV13,
  computeTotalComplicationRateV13,
  type AnesthesiaComplicationRecordV13,
} from "../../src/bff/aggregators/anesthesiaComplicationV13Aggregator";
import { anesthesiaComplicationV13Routes } from "../../src/bff/routes/anesthesiaComplicationV13";

const records: AnesthesiaComplicationRecordV13[] = [
  { totalAnesthesia: 1000, complicationCount: 5, severeComplicationCount: 1 },
];

describe("computeTotalComplicationRateV13", () => {
  // 算式：5/1000×100 = 0.5
  it("总发生率 = 0.5%", () => {
    expect(computeTotalComplicationRateV13(records)).toBe(0.5);
  });
  it("空态 → 0", () => {
    expect(computeTotalComplicationRateV13([])).toBe(0);
  });
});

describe("computeSevereComplicationRateV13", () => {
  // 算式：1/1000×100 = 0.1
  it("严重并发症率 = 0.1%", () => {
    expect(computeSevereComplicationRateV13(records)).toBe(0.1);
  });
  it("空态 → 0", () => {
    expect(computeSevereComplicationRateV13([])).toBe(0);
  });
});

describe("anesthesiaComplicationV13Routes 读路由", () => {
  it("GET /api/v1/anesthesia-complication 路由存在且 auth:true", () => {
    const route = anesthesiaComplicationV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/anesthesia-complication",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
