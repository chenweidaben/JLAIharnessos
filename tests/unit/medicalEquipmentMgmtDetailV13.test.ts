/**
 * 健澜科技 jlmedaios - 医疗设备管理（细节）V13 单测（M418-B，detail 避让旧版 equipmentMgmtV13/consumableSupplyV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEquipmentCalibrationPassRateV13,
  computeEquipmentInspectionCompletionRateV13,
  computeEquipmentRepairTimelyRateV13,
  type MedicalEquipmentMgmtDetailRecordV13,
} from "../../src/bff/aggregators/medicalEquipmentMgmtDetailV13Aggregator";
import { medicalEquipmentMgmtDetailV13Routes } from "../../src/bff/routes/medicalEquipmentMgmtDetailV13";

const records: MedicalEquipmentMgmtDetailRecordV13[] = [
  { inspectionDone: 980, shouldInspectTotal: 1000, repairTimely: 950, repairTotal: 1000, calibrationQualified: 990, calibrationTotal: 1000 },
  { inspectionDone: 980, shouldInspectTotal: 1000, repairTimely: 950, repairTotal: 1000, calibrationQualified: 990, calibrationTotal: 1000 },
];

describe("computeEquipmentInspectionCompletionRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("设备巡检完成率 = 98.00%", () => {
    expect(computeEquipmentInspectionCompletionRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeEquipmentInspectionCompletionRateV13([])).toBe(0);
  });
});

describe("computeEquipmentRepairTimelyRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("设备故障维修及时率 = 95.00%", () => {
    expect(computeEquipmentRepairTimelyRateV13(records)).toBe(95.00);
  });
});

describe("computeEquipmentCalibrationPassRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("设备计量合格率 = 99.00%", () => {
    expect(computeEquipmentCalibrationPassRateV13(records)).toBe(99.00);
  });
});

describe("medicalEquipmentMgmtDetailV13Routes 读路由", () => {
  it("GET /api/v1/medical-equipment-mgmt-detail 路由存在且 auth:true", () => {
    const route = medicalEquipmentMgmtDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-equipment-mgmt-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
