/**
 * 健澜科技 jlmedaios - 医疗设备维保到期提醒 V13 单测（M313-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  checkMaintenanceDueV13,
  classifyMaintenanceUrgencyV13,
  detectOverdueMaintenanceV13,
  type MedicalDeviceV13,
} from "../../src/bff/aggregators/equipmentMaintenanceV13Aggregator";
import { equipmentMaintenanceV13Routes } from "../../src/bff/routes/equipmentMaintenanceV13";

const devices: MedicalDeviceV13[] = [
  { deviceId: "d1", name: "CT", nextMaintenance: "2026-11-01" },
  { deviceId: "d2", name: "MRI", nextMaintenance: "2026-12-01" },
  { deviceId: "d3", name: "X光机", nextMaintenance: "2026-09-30" },
];

const today = "2026-10-17";

describe("checkMaintenanceDueV13", () => {
  // 算式：next=2026-11-01, today=2026-10-17 → 10/17 → 11/01 = 15 天
  it("CT 剩余 = 15 天", () => {
    expect(checkMaintenanceDueV13(devices[0], today)).toBe(15);
  });
  // 算式：next=2026-09-30, today=2026-10-17 → 9/30 → 10/17 = -17 天
  it("X光机 剩余 = -17 天（超期）", () => {
    expect(checkMaintenanceDueV13(devices[2], today)).toBe(-17);
  });
});

describe("classifyMaintenanceUrgencyV13", () => {
  // 算式：daysLeft=15 ≤ 30 → 红
  it("15 天 → 红", () => {
    expect(classifyMaintenanceUrgencyV13(15)).toBe("红");
  });
  // 算式：daysLeft=45 在 31-60 → 橙
  it("45 天 → 橙", () => {
    expect(classifyMaintenanceUrgencyV13(45)).toBe("橙");
  });
  // 算式：daysLeft=75 在 61-90 → 蓝
  it("75 天 → 蓝", () => {
    expect(classifyMaintenanceUrgencyV13(75)).toBe("蓝");
  });
  // 算式：daysLeft=120 > 90 → 绿
  it("120 天 → 绿", () => {
    expect(classifyMaintenanceUrgencyV13(120)).toBe("绿");
  });
});

describe("detectOverdueMaintenanceV13", () => {
  // 算式：d3 daysLeft=-17 < 0 → 超期；d1=15, d2=45 不超期
  it("超期 = [d3]", () => {
    expect(detectOverdueMaintenanceV13(devices, today).map((o) => o.deviceId)).toEqual(["d3"]);
  });
  it("空态 → []", () => {
    expect(detectOverdueMaintenanceV13([], today).length).toBe(0);
  });
});

describe("equipmentMaintenanceV13Routes 读路由", () => {
  it("GET /api/v1/equipment-maintenance 路由存在且 auth:true", () => {
    const route = equipmentMaintenanceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/equipment-maintenance",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
