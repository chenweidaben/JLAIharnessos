/**
 * 健澜科技 jlmedaios - 中医服务 V13 单测（M350-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeNonDrugTherapyRateV13,
  computeTcmInpatientRatioV13,
  computeTcmOutpatientVisitsV13,
  type TcmServiceRecordV13,
} from "../../src/bff/aggregators/tcmServiceV13Aggregator";
import { tcmServiceV13Routes } from "../../src/bff/routes/tcmServiceV13";

const records: TcmServiceRecordV13[] = [
  { tcmOutpatientVisits: 500, tcmBedDays: 500, totalBedDays: 1000, nonDrugTherapyCount: 150 },
  { tcmOutpatientVisits: 500, tcmBedDays: 500, totalBedDays: 1000, nonDrugTherapyCount: 150 },
];

describe("computeTcmOutpatientVisitsV13", () => {
  // 算式：500+500 = 1000
  it("中医门诊人次 = 1000", () => {
    expect(computeTcmOutpatientVisitsV13(records)).toBe(1000);
  });
  it("空态 → 0", () => {
    expect(computeTcmOutpatientVisitsV13([])).toBe(0);
  });
});

describe("computeTcmInpatientRatioV13", () => {
  // 算式：(500+500)/(1000+1000) = 1000/2000×100 = 50.00
  it("中医病房占比 = 50.00%", () => {
    expect(computeTcmInpatientRatioV13(records)).toBe(50.00);
  });
});

describe("computeNonDrugTherapyRateV13", () => {
  // 算式：(150+150)/(500+500) = 300/1000×100 = 30.00
  it("非药物疗法使用率 = 30.00%", () => {
    expect(computeNonDrugTherapyRateV13(records)).toBe(30.00);
  });
});

describe("tcmServiceV13Routes 读路由", () => {
  it("GET /api/v1/tcm-service 路由存在且 auth:true", () => {
    const route = tcmServiceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/tcm-service",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
