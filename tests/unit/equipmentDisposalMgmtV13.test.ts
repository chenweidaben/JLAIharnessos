/**
 * 健澜科技 jlmedaios - 设备报废处置管理 V13 单测（M449-D，M449 收官，医疗装备与设备管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEquipmentDisposalAssetTurnoverRateV13,
  computeEquipmentDisposalAssessmentComplianceRateV13,
  computeEquipmentDisposalTimelinessRateV13,
  type EquipmentDisposalMgmtRecordV13,
} from "../../src/bff/aggregators/equipmentDisposalMgmtV13Aggregator";
import { equipmentDisposalMgmtV13Routes } from "../../src/bff/routes/equipmentDisposalMgmtV13";

const records: EquipmentDisposalMgmtRecordV13[] = [
  { compliant: 950, shouldAssess: 1000, timely: 900, shouldDispose: 1000, disposed: 50, totalAsset: 1000 },
  { compliant: 950, shouldAssess: 1000, timely: 900, shouldDispose: 1000, disposed: 50, totalAsset: 1000 },
];

describe("computeEquipmentDisposalAssessmentComplianceRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("报废鉴定合规率 = 95.00%", () => {
    expect(computeEquipmentDisposalAssessmentComplianceRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeEquipmentDisposalAssessmentComplianceRateV13([])).toBe(0);
  });
});

describe("computeEquipmentDisposalTimelinessRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("报废处置及时率 = 90.00%", () => {
    expect(computeEquipmentDisposalTimelinessRateV13(records)).toBe(90.00);
  });
});

describe("computeEquipmentDisposalAssetTurnoverRateV13", () => {
  // 算式：(50+50)/(1000+1000)×100 = 100/2000×100 = 5.00（中性/反向，过高=设备老化严重）
  it("设备资产周转率 = 5.00%（中性/反向，过高=设备老化严重）", () => {
    expect(computeEquipmentDisposalAssetTurnoverRateV13(records)).toBe(5.00);
  });
});

describe("equipmentDisposalMgmtV13Routes 读路由", () => {
  it("GET /api/v1/equipment-disposal-mgmt 路由存在且 auth:true", () => {
    const route = equipmentDisposalMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/equipment-disposal-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
