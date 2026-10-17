/**
 * 健澜科技 jlmedaios - 设备管理 V13 单测（M377-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEquipmentGoodRateV13,
  computeEquipmentInspectionCompletionRateV13,
  computeMedicalEquipmentCountV13,
  type EquipmentMgmtRecordV13,
} from "../../src/bff/aggregators/equipmentMgmtV13Aggregator";
import { equipmentMgmtV13Routes } from "../../src/bff/routes/equipmentMgmtV13";

const records: EquipmentMgmtRecordV13[] = [
  { equipmentTotalCount: 1000, equipmentGoodCount: 950, shouldInspectCount: 100, inspectCompleteCount: 98 },
  { equipmentTotalCount: 1000, equipmentGoodCount: 950, shouldInspectCount: 100, inspectCompleteCount: 98 },
];

describe("computeMedicalEquipmentCountV13", () => {
  // 算式：1000+1000 = 2000
  it("医疗设备总台数 = 2000 台", () => {
    expect(computeMedicalEquipmentCountV13(records)).toBe(2000);
  });
  it("空态 → 0", () => {
    expect(computeMedicalEquipmentCountV13([])).toBe(0);
  });
});

describe("computeEquipmentGoodRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("设备完好率 = 95.00%", () => {
    expect(computeEquipmentGoodRateV13(records)).toBe(95.00);
  });
});

describe("computeEquipmentInspectionCompletionRateV13", () => {
  // 算式：(98+98)/(100+100) = 196/200×100 = 98.00
  it("设备巡检完成率 = 98.00%", () => {
    expect(computeEquipmentInspectionCompletionRateV13(records)).toBe(98.00);
  });
});

describe("equipmentMgmtV13Routes 读路由", () => {
  it("GET /api/v1/equipment-mgmt 路由存在且 auth:true", () => {
    const route = equipmentMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/equipment-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
