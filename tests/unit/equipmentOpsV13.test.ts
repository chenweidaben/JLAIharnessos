/**
 * 健澜科技 jlmedaios - 设备运维 V13 单测（M328-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMTBFV13,
  countMaintenanceTasksV13,
  sumDowntimeHoursV13,
  type EquipmentRecordV13,
} from "../../src/bff/aggregators/equipmentOpsV13Aggregator";
import { equipmentOpsV13Routes } from "../../src/bff/routes/equipmentOpsV13";

const records: EquipmentRecordV13[] = [
  { deviceName: "CT", maintenanceCount: 2, downtimeHours: 5, totalRuntimeHours: 500, failureCount: 1 },
  { deviceName: "MRI", maintenanceCount: 2, downtimeHours: 5, totalRuntimeHours: 300, failureCount: 1 },
  { deviceName: "X光机", maintenanceCount: 1, downtimeHours: 0, totalRuntimeHours: 200, failureCount: 0 },
];

describe("countMaintenanceTasksV13", () => {
  // 算式：2+2+1 = 5
  it("保养次数 = 5", () => {
    expect(countMaintenanceTasksV13(records)).toBe(5);
  });
  it("空态 → 0", () => {
    expect(countMaintenanceTasksV13([])).toBe(0);
  });
});

describe("sumDowntimeHoursV13", () => {
  // 算式：5+5+0 = 10
  it("停机时长 = 10 小时", () => {
    expect(sumDowntimeHoursV13(records)).toBe(10);
  });
});

describe("computeMTBFV13", () => {
  // 算式：(500+300+200)/(1+1+0) = 1000/2 = 500
  it("MTBF = 500 小时", () => {
    expect(computeMTBFV13(records)).toBe(500);
  });
});

describe("equipmentOpsV13Routes 读路由", () => {
  it("GET /api/v1/equipment-ops-overview 路由存在且 auth:true", () => {
    const route = equipmentOpsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/equipment-ops-overview",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
