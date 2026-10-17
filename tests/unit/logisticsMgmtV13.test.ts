/**
 * 健澜科技 jlmedaios - 后勤管理 V13 单测（M362-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEquipmentIntactRateV13,
  computeMaterialSupplyTimelyRateV13,
  computePropertySatisfactionV13,
  type LogisticsMgmtRecordV13,
} from "../../src/bff/aggregators/logisticsMgmtV13Aggregator";
import { logisticsMgmtV13Routes } from "../../src/bff/routes/logisticsMgmtV13";

const records: LogisticsMgmtRecordV13[] = [
  { intactEquipment: 950, totalEquipment: 1000, timelySupply: 480, totalSupply: 500, propertySatisfaction: 95 },
  { intactEquipment: 950, totalEquipment: 1000, timelySupply: 470, totalSupply: 500, propertySatisfaction: 97 },
];

describe("computeEquipmentIntactRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("设备完好率 = 95.00%", () => {
    expect(computeEquipmentIntactRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeEquipmentIntactRateV13([])).toBe(0);
  });
});

describe("computeMaterialSupplyTimelyRateV13", () => {
  // 算式：(480+470)/(500+500) = 950/1000×100 = 95.00
  it("物资供应及时率 = 95.00%", () => {
    expect(computeMaterialSupplyTimelyRateV13(records)).toBe(95.00);
  });
});

describe("computePropertySatisfactionV13", () => {
  // 算式：(95+97)/2 = 96.00
  it("物业满意度 = 96.00", () => {
    expect(computePropertySatisfactionV13(records)).toBe(96.00);
  });
});

describe("logisticsMgmtV13Routes 读路由", () => {
  it("GET /api/v1/logistics-mgmt 路由存在且 auth:true", () => {
    const route = logisticsMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/logistics-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
