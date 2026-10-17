/**
 * 健澜科技 jlmedaios - 车辆管理 V13 单测（M352-D，M352 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEmergencyVehicleWaitMinutesV13,
  computeParkingOccupancyRateV13,
  computeVisitorRegisterRateV13,
  type ParkingMgmtRecordV13,
} from "../../src/bff/aggregators/parkingMgmtV13Aggregator";
import { parkingMgmtV13Routes } from "../../src/bff/routes/parkingMgmtV13";

const records: ParkingMgmtRecordV13[] = [
  { usedParkingCount: 80, totalParkingCount: 100, emergencyWaitMinutes: 5, visitorRegisteredCount: 90, visitorTotalCount: 100 },
  { usedParkingCount: 70, totalParkingCount: 100, emergencyWaitMinutes: 7, visitorRegisteredCount: 85, visitorTotalCount: 100 },
];

describe("computeParkingOccupancyRateV13", () => {
  // 算式：(80+70)/(100+100) = 150/200×100 = 75.00
  it("车位使用率 = 75.00%", () => {
    expect(computeParkingOccupancyRateV13(records)).toBe(75.00);
  });
  it("空态 → 0", () => {
    expect(computeParkingOccupancyRateV13([])).toBe(0);
  });
});

describe("computeEmergencyVehicleWaitMinutesV13", () => {
  // 算式：(5+7)/2 = 12/2 = 6.00
  it("急诊车辆等待时长 = 6.00 分钟", () => {
    expect(computeEmergencyVehicleWaitMinutesV13(records)).toBe(6.00);
  });
});

describe("computeVisitorRegisterRateV13", () => {
  // 算式：(90+85)/(100+100) = 175/200×100 = 87.50
  it("访客登记率 = 87.50%", () => {
    expect(computeVisitorRegisterRateV13(records)).toBe(87.50);
  });
});

describe("parkingMgmtV13Routes 读路由", () => {
  it("GET /api/v1/parking-mgmt 路由存在且 auth:true", () => {
    const route = parkingMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/parking-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
