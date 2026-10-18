/**
 * 健澜科技 jlmedaios - 设备维护保养管理 V13 单测（M449-B，医疗装备与设备管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEquipmentMaintenanceDowntimeRateV13,
  computeEquipmentMaintenancePreventivePlanCompletionRateV13,
  computeEquipmentMaintenanceRepairTimelinessRateV13,
  type EquipmentMaintenanceMgmtRecordV13,
} from "../../src/bff/aggregators/equipmentMaintenanceMgmtV13Aggregator";
import { equipmentMaintenanceMgmtV13Routes } from "../../src/bff/routes/equipmentMaintenanceMgmtV13";

const records: EquipmentMaintenanceMgmtRecordV13[] = [
  { preventiveDone: 950, preventivePlanned: 1000, downtimeHours: 30, totalHours: 1000, repairTimely: 900, totalFault: 1000 },
  { preventiveDone: 950, preventivePlanned: 1000, downtimeHours: 30, totalHours: 1000, repairTimely: 900, totalFault: 1000 },
];

describe("computeEquipmentMaintenancePreventivePlanCompletionRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("预防性保养计划完成率 = 95.00%", () => {
    expect(computeEquipmentMaintenancePreventivePlanCompletionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeEquipmentMaintenancePreventivePlanCompletionRateV13([])).toBe(0);
  });
});

describe("computeEquipmentMaintenanceDowntimeRateV13", () => {
  // 算式：(30+30)/(1000+1000)×100 = 60/2000×100 = 3.00（反向，越低越好）
  it("设备故障停机率 = 3.00%（反向，越低越好）", () => {
    expect(computeEquipmentMaintenanceDowntimeRateV13(records)).toBe(3.00);
  });
});

describe("computeEquipmentMaintenanceRepairTimelinessRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("设备维修及时率 = 90.00%", () => {
    expect(computeEquipmentMaintenanceRepairTimelinessRateV13(records)).toBe(90.00);
  });
});

describe("equipmentMaintenanceMgmtV13Routes 读路由", () => {
  it("GET /api/v1/equipment-maintenance-mgmt 路由存在且 auth:true", () => {
    const route = equipmentMaintenanceMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/equipment-maintenance-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
