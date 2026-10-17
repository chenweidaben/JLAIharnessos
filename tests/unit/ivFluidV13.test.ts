/**
 * 健澜科技 jlmedaios - 静脉输液率 V13 单测（M336-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInpatientIVRateV13,
  computeOutpatientIVRateV13,
  type IVFluidRecordV13,
} from "../../src/bff/aggregators/ivFluidV13Aggregator";
import { ivFluidV13Routes } from "../../src/bff/routes/ivFluidV13";

const records: IVFluidRecordV13[] = [
  {
    outpatientTotalVisits: 1000,
    outpatientIVVisits: 100,
    inpatientTotalPatients: 500,
    inpatientIVPatients: 300,
  },
];

describe("computeOutpatientIVRateV13", () => {
  // 算式：100/1000×100 = 10
  it("门诊输液率 = 10%", () => {
    expect(computeOutpatientIVRateV13(records)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientIVRateV13([])).toBe(0);
  });
});

describe("computeInpatientIVRateV13", () => {
  // 算式：300/500×100 = 60
  it("住院输液率 = 60%", () => {
    expect(computeInpatientIVRateV13(records)).toBe(60);
  });
  it("空态 → 0", () => {
    expect(computeInpatientIVRateV13([])).toBe(0);
  });
});

describe("ivFluidV13Routes 读路由", () => {
  it("GET /api/v1/iv-fluid 路由存在且 auth:true", () => {
    const route = ivFluidV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/iv-fluid",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
