/**
 * 健澜科技 jlmedaios - 设备质量管理 V13 单测（M431-B，-quality 后缀避让旧版 medicalDeviceDetailV13（M418））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDeviceCompletenessRateV13,
  computeDeviceFailureRateV13,
  computeDeviceUtilizationRateV13,
  type DeviceQualityMgmtRecordV13,
} from "../../src/bff/aggregators/deviceQualityMgmtV13Aggregator";
import { deviceQualityMgmtV13Routes } from "../../src/bff/routes/deviceQualityMgmtV13";

const records: DeviceQualityMgmtRecordV13[] = [
  { intact: 980, failure: 20, deviceTotal: 1000, actualHours: 1800, requiredHours: 2000 },
  { intact: 980, failure: 20, deviceTotal: 1000, actualHours: 1800, requiredHours: 2000 },
];

describe("computeDeviceCompletenessRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("设备完好率 = 98.00%", () => {
    expect(computeDeviceCompletenessRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeDeviceCompletenessRateV13([])).toBe(0);
  });
});

describe("computeDeviceFailureRateV13", () => {
  // 算式：(20+20)/(1000+1000)×100 = 40/2000×100 = 2.00%（反向指标）
  it("设备故障率 = 2.00%（反向指标）", () => {
    expect(computeDeviceFailureRateV13(records)).toBe(2.00);
  });
});

describe("computeDeviceUtilizationRateV13", () => {
  // 算式：(1800+1800)/(2000+2000)×100 = 3600/4000×100 = 90.00
  it("设备开机率 = 90.00%", () => {
    expect(computeDeviceUtilizationRateV13(records)).toBe(90.00);
  });
});

describe("deviceQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/device-quality-mgmt 路由存在且 auth:true", () => {
    const route = deviceQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/device-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
