/**
 * 健澜科技 jlmedaios - 急诊容量预警 V13 单测（M312-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessWaitTimeV13,
  computeObsBedOccupancyV13,
  identifyNeedReinforceV13,
} from "../../src/bff/aggregators/emergencyCapacityV13Aggregator";
import { emergencyCapacityV13Routes } from "../../src/bff/routes/emergencyCapacityV13";

describe("computeObsBedOccupancyV13", () => {
  // 算式：occupied=45 / total=50 × 100 = 90
  it("45/50 = 90%", () => {
    expect(computeObsBedOccupancyV13({ total: 50, occupied: 45 })).toBe(90);
  });
  it("total=0 → 0", () => {
    expect(computeObsBedOccupancyV13({ total: 0, occupied: 0 })).toBe(0);
  });
});

describe("assessWaitTimeV13", () => {
  // 算式：wait=45 在 30-60 → 黄灯
  it("45min → 黄灯", () => {
    expect(assessWaitTimeV13(45)).toBe("黄灯");
  });
  // 算式：wait=70 > 60 → 红灯
  it("70min → 红灯", () => {
    expect(assessWaitTimeV13(70)).toBe("红灯");
  });
  // 算式：wait=20 < 30 → 绿灯
  it("20min → 绿灯", () => {
    expect(assessWaitTimeV13(20)).toBe("绿灯");
  });
});

describe("identifyNeedReinforceV13", () => {
  // 算式：occupancy=90 ≥ 90 → 需增援
  it("占用率 90% → 需增援", () => {
    expect(identifyNeedReinforceV13(90, 45)).toBe("需增援");
  });
  // 算式：occupancy=70, wait=45 (<90% 且 ≤60min) → 运行平稳
  it("占用率 70% + 45min → 运行平稳", () => {
    expect(identifyNeedReinforceV13(70, 45)).toBe("运行平稳");
  });
});

describe("emergencyCapacityV13Routes 读路由", () => {
  it("GET /api/v1/emergency-capacity 路由存在且 auth:true", () => {
    const route = emergencyCapacityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/emergency-capacity",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
