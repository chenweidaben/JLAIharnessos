/**
 * 健澜科技 jlmedaios - 抢救管理 V13 单测（M415-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeRescueEquipmentIntegrityRateV13,
  computeRescueRecordCompletenessRateV13,
  computeRescueSuccessAssessmentRateV13,
  type RescueMgmtRecordV13,
} from "../../src/bff/aggregators/rescueMgmtV13Aggregator";
import { rescueMgmtV13Routes } from "../../src/bff/routes/rescueMgmtV13";

const records: RescueMgmtRecordV13[] = [
  { complete: 980, recordTotal: 1000, assessedSuccess: 750, rescueTotal: 1000, intact: 990, equipmentTotal: 1000 },
  { complete: 980, recordTotal: 1000, assessedSuccess: 750, rescueTotal: 1000, intact: 990, equipmentTotal: 1000 },
];

describe("computeRescueRecordCompletenessRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("抢救记录完整率 = 98.00%", () => {
    expect(computeRescueRecordCompletenessRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeRescueRecordCompletenessRateV13([])).toBe(0);
  });
});

describe("computeRescueSuccessAssessmentRateV13", () => {
  // 算式：(750+750)/(1000+1000)×100 = 1500/2000×100 = 75.00
  it("抢救成功评估率 = 75.00%", () => {
    expect(computeRescueSuccessAssessmentRateV13(records)).toBe(75.00);
  });
});

describe("computeRescueEquipmentIntegrityRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("抢救设备完好率 = 99.00%", () => {
    expect(computeRescueEquipmentIntegrityRateV13(records)).toBe(99.00);
  });
});

describe("rescueMgmtV13Routes 读路由", () => {
  it("GET /api/v1/rescue-mgmt 路由存在且 auth:true", () => {
    const route = rescueMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/rescue-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
