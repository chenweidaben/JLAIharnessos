/**
 * 健澜科技 jlmedaios - 设备维护统计 V13 单测（M385-B，stats 避让）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAvgFaultResponseHoursV13,
  computeEquipmentGoodRateV13,
  computeEquipmentInspectionCountV13,
  type EquipmentMaintenanceRecordV13,
} from "../../src/bff/aggregators/equipmentMaintenanceStatsV13Aggregator";
import { equipmentMaintenanceStatsV13Routes } from "../../src/bff/routes/equipmentMaintenanceStatsV13";

const records: EquipmentMaintenanceRecordV13[] = [
  { inspectionCount: 100, totalResponseHours: 240, faultCount: 120, goodCount: 950, totalCount: 1000 },
  { inspectionCount: 100, totalResponseHours: 240, faultCount: 120, goodCount: 950, totalCount: 1000 },
];

describe("computeEquipmentInspectionCountV13", () => {
  // 算式：100+100 = 200
  it("设备巡检次数 = 200 次", () => {
    expect(computeEquipmentInspectionCountV13(records)).toBe(200);
  });
  it("空态 → 0", () => {
    expect(computeEquipmentInspectionCountV13([])).toBe(0);
  });
});

describe("computeAvgFaultResponseHoursV13", () => {
  // 算式：(240+240)/(120+120) = 480/240 = 2.00
  it("故障响应时长 = 2.00 小时", () => {
    expect(computeAvgFaultResponseHoursV13(records)).toBe(2.00);
  });
});

describe("computeEquipmentGoodRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("设备完好率 = 95.00%", () => {
    expect(computeEquipmentGoodRateV13(records)).toBe(95.00);
  });
});

describe("equipmentMaintenanceStatsV13Routes 读路由", () => {
  it("GET /api/v1/equipment-maintenance-stats 路由存在且 auth:true", () => {
    const route = equipmentMaintenanceStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/equipment-maintenance-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
