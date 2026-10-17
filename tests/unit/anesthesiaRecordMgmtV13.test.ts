/**
 * 健澜科技 jlmedaios - 麻醉记录管理 V13 单测（M426-B，换名避让旧版 anesthesiaComplicationV13（M339））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAnesthesiaRecordCompleteRateV13,
  computeAnesthesiaRecordPassRateV13,
  computeAnesthesiaRecordTimelyRateV13,
  type AnesthesiaRecordMgmtRecordV13,
} from "../../src/bff/aggregators/anesthesiaRecordMgmtV13Aggregator";
import { anesthesiaRecordMgmtV13Routes } from "../../src/bff/routes/anesthesiaRecordMgmtV13";

const records: AnesthesiaRecordMgmtRecordV13[] = [
  { completeAnes: 980, timelyAnes: 950, passAnes: 990, anesTotal: 1000 },
  { completeAnes: 980, timelyAnes: 950, passAnes: 990, anesTotal: 1000 },
];

describe("computeAnesthesiaRecordCompleteRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("麻醉记录完整率 = 98.00%", () => {
    expect(computeAnesthesiaRecordCompleteRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeAnesthesiaRecordCompleteRateV13([])).toBe(0);
  });
});

describe("computeAnesthesiaRecordTimelyRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("麻醉记录及时率 = 95.00%", () => {
    expect(computeAnesthesiaRecordTimelyRateV13(records)).toBe(95.00);
  });
});

describe("computeAnesthesiaRecordPassRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("麻醉记录合格率 = 99.00%", () => {
    expect(computeAnesthesiaRecordPassRateV13(records)).toBe(99.00);
  });
});

describe("anesthesiaRecordMgmtV13Routes 读路由", () => {
  it("GET /api/v1/anesthesia-record-mgmt 路由存在且 auth:true", () => {
    const route = anesthesiaRecordMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/anesthesia-record-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
