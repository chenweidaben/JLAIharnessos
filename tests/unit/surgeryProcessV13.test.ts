/**
 * 健澜科技 jlmedaios - 手术过程 V13 单测（M391-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeIntraoperativeAdverseEventCountV13,
  computeSurgeryOnTimeEndRateV13,
  computeSurgeryOnTimeStartRateV13,
  type SurgeryProcessRecordV13,
} from "../../src/bff/aggregators/surgeryProcessV13Aggregator";
import { surgeryProcessV13Routes } from "../../src/bff/routes/surgeryProcessV13";

const records: SurgeryProcessRecordV13[] = [
  { onTimeStartCount: 900, onTimeEndCount: 950, surgeryTotalCount: 1000, adverseEventCount: 5 },
  { onTimeStartCount: 900, onTimeEndCount: 950, surgeryTotalCount: 1000, adverseEventCount: 5 },
];

describe("computeSurgeryOnTimeStartRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("手术准时开始率 = 90.00%", () => {
    expect(computeSurgeryOnTimeStartRateV13(records)).toBe(90.00);
  });
  it("空态 → 0", () => {
    expect(computeSurgeryOnTimeStartRateV13([])).toBe(0);
  });
});

describe("computeSurgeryOnTimeEndRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("手术准点结束率 = 95.00%", () => {
    expect(computeSurgeryOnTimeEndRateV13(records)).toBe(95.00);
  });
});

describe("computeIntraoperativeAdverseEventCountV13", () => {
  // 算式：5+5 = 10
  it("术中不良事件数 = 10 起", () => {
    expect(computeIntraoperativeAdverseEventCountV13(records)).toBe(10);
  });
});

describe("surgeryProcessV13Routes 读路由", () => {
  it("GET /api/v1/surgery-process 路由存在且 auth:true", () => {
    const route = surgeryProcessV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/surgery-process",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
