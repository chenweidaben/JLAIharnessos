/**
 * 健澜科技 jlmedaios - 设备计量校准管理 V13 单测（M449-C，医疗装备与设备管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEquipmentCalibrationMandatoryCoverageRateV13,
  computeEquipmentCalibrationPeriodicRateV13,
  computeEquipmentCalibrationQualifiedRateV13,
  type EquipmentCalibrationMgmtRecordV13,
} from "../../src/bff/aggregators/equipmentCalibrationMgmtV13Aggregator";
import { equipmentCalibrationMgmtV13Routes } from "../../src/bff/routes/equipmentCalibrationMgmtV13";

const records: EquipmentCalibrationMgmtRecordV13[] = [
  { ontime: 950, shouldCalibrate: 1000, qualified: 900, totalCalibrated: 1000, covered: 980, totalMandatory: 1000 },
  { ontime: 950, shouldCalibrate: 1000, qualified: 900, totalCalibrated: 1000, covered: 980, totalMandatory: 1000 },
];

describe("computeEquipmentCalibrationPeriodicRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("计量器具周期校准率 = 95.00%", () => {
    expect(computeEquipmentCalibrationPeriodicRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeEquipmentCalibrationPeriodicRateV13([])).toBe(0);
  });
});

describe("computeEquipmentCalibrationQualifiedRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("校准合格率 = 90.00%", () => {
    expect(computeEquipmentCalibrationQualifiedRateV13(records)).toBe(90.00);
  });
});

describe("computeEquipmentCalibrationMandatoryCoverageRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("强检器具覆盖率 = 98.00%", () => {
    expect(computeEquipmentCalibrationMandatoryCoverageRateV13(records)).toBe(98.00);
  });
});

describe("equipmentCalibrationMgmtV13Routes 读路由", () => {
  it("GET /api/v1/equipment-calibration-mgmt 路由存在且 auth:true", () => {
    const route = equipmentCalibrationMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/equipment-calibration-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
