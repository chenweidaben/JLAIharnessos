/**
 * 健澜科技 jlmedaios - 医疗器械管理 V13 单测（M408-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMedicalDeviceInspectionPassRateV13,
  computeMedicalDeviceIntegrityRateV13,
  computeMetrologicalTestPassRateV13,
  type MedicalDeviceMgmtRecordV13,
} from "../../src/bff/aggregators/medicalDeviceMgmtV13Aggregator";
import { medicalDeviceMgmtV13Routes } from "../../src/bff/routes/medicalDeviceMgmtV13";

const records: MedicalDeviceMgmtRecordV13[] = [
  { intact: 980, total: 1000, inspPass: 970, inspTotal: 1000, metPass: 990, metTotal: 1000 },
  { intact: 980, total: 1000, inspPass: 970, inspTotal: 1000, metPass: 990, metTotal: 1000 },
];

describe("computeMedicalDeviceIntegrityRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("设备完好率 = 98.00%", () => {
    expect(computeMedicalDeviceIntegrityRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeMedicalDeviceIntegrityRateV13([])).toBe(0);
  });
});

describe("computeMedicalDeviceInspectionPassRateV13", () => {
  // 算式：(970+970)/(1000+1000)×100 = 1940/2000×100 = 97.00
  it("设备巡检合格率 = 97.00%", () => {
    expect(computeMedicalDeviceInspectionPassRateV13(records)).toBe(97.00);
  });
});

describe("computeMetrologicalTestPassRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("计量检测合格率 = 99.00%", () => {
    expect(computeMetrologicalTestPassRateV13(records)).toBe(99.00);
  });
});

describe("medicalDeviceMgmtV13Routes 读路由", () => {
  it("GET /api/v1/medical-device-mgmt 路由存在且 auth:true", () => {
    const route = medicalDeviceMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-device-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
