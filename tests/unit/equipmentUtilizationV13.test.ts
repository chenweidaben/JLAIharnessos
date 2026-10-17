/**
 * 健澜科技 jlmedaios - 大型设备开机率 V13 单测（M351-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCTHoursV13,
  computeDSAHoursV13,
  computeMRIHoursV13,
  type EquipmentUtilizationRecordV13,
} from "../../src/bff/aggregators/equipmentUtilizationV13Aggregator";
import { equipmentUtilizationV13Routes } from "../../src/bff/routes/equipmentUtilizationV13";

const records: EquipmentUtilizationRecordV13[] = [
  { ctHours: 200, mriHours: 150, dsaHours: 80 },
  { ctHours: 200, mriHours: 150, dsaHours: 80 },
];

describe("computeCTHoursV13", () => {
  // 算式：200+200 = 400
  it("CT 月度开机小时数 = 400", () => {
    expect(computeCTHoursV13(records)).toBe(400);
  });
  it("空态 → 0", () => {
    expect(computeCTHoursV13([])).toBe(0);
  });
});

describe("computeMRIHoursV13", () => {
  // 算式：150+150 = 300
  it("MRI 月度开机小时数 = 300", () => {
    expect(computeMRIHoursV13(records)).toBe(300);
  });
});

describe("computeDSAHoursV13", () => {
  // 算式：80+80 = 160
  it("DSA 月度开机小时数 = 160", () => {
    expect(computeDSAHoursV13(records)).toBe(160);
  });
});

describe("equipmentUtilizationV13Routes 读路由", () => {
  it("GET /api/v1/equipment-utilization 路由存在且 auth:true", () => {
    const route = equipmentUtilizationV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/equipment-utilization",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
