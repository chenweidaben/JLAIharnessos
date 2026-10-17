/**
 * 健澜科技 jlmedaios - 麻醉质量 V13 单测（M371-D，M371 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAnesthesiaComplicationRateV13,
  computeAnesthesiaMortalityRateV13,
  computePostoperativeAnalgesiaRateV13,
  type AnesthesiaQualityRecordV13,
} from "../../src/bff/aggregators/anesthesiaQualityV13Aggregator";
import { anesthesiaQualityV13Routes } from "../../src/bff/routes/anesthesiaQualityV13";

const records: AnesthesiaQualityRecordV13[] = [
  { anesthesiaCount: 1000, anesthesiaMortalityCount: 1, anesthesiaComplicationCount: 5, surgeryCount: 1000, postoperativeAnalgesiaCount: 800 },
  { anesthesiaCount: 1000, anesthesiaMortalityCount: 1, anesthesiaComplicationCount: 5, surgeryCount: 1000, postoperativeAnalgesiaCount: 800 },
];

describe("computeAnesthesiaMortalityRateV13", () => {
  // 算式：(1+1)/(1000+1000) = 2/2000×100 = 0.10
  it("麻醉死亡率 = 0.10%", () => {
    expect(computeAnesthesiaMortalityRateV13(records)).toBe(0.10);
  });
  it("空态 → 0", () => {
    expect(computeAnesthesiaMortalityRateV13([])).toBe(0);
  });
});

describe("computeAnesthesiaComplicationRateV13", () => {
  // 算式：(5+5)/(1000+1000) = 10/2000×100 = 0.50
  it("麻醉并发症率 = 0.50%", () => {
    expect(computeAnesthesiaComplicationRateV13(records)).toBe(0.50);
  });
});

describe("computePostoperativeAnalgesiaRateV13", () => {
  // 算式：(800+800)/(1000+1000) = 1600/2000×100 = 80.00
  it("术后镇痛率 = 80.00%", () => {
    expect(computePostoperativeAnalgesiaRateV13(records)).toBe(80.00);
  });
});

describe("anesthesiaQualityV13Routes 读路由", () => {
  it("GET /api/v1/anesthesia-quality 路由存在且 auth:true", () => {
    const route = anesthesiaQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/anesthesia-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
