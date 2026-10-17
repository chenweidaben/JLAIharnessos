/**
 * 健澜科技 jlmedaios - 五角色 MUSE 飞轮总览 V13 单测（M321-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildRoleComparisonV13,
  computeTotalCallsV13,
  identifyLeadingRoleV13,
  type RoleFlywheelV13,
} from "../../src/bff/aggregators/museFlywheelOverviewV13Aggregator";
import { museFlywheelOverviewV13Routes } from "../../src/bff/routes/museFlywheelOverviewV13";

const roles: RoleFlywheelV13[] = [
  { role: "doctor", callCount: 100, hitRate: 80, adoptionRate: 80 },
  { role: "nurse", callCount: 50, hitRate: 85, adoptionRate: 85 },
  { role: "pharmacist", callCount: 30, hitRate: 90, adoptionRate: 90 },
  { role: "admin", callCount: 20, hitRate: 75, adoptionRate: 75 },
  { role: "patient", callCount: 10, hitRate: 70, adoptionRate: 70 },
];

describe("buildRoleComparisonV13", () => {
  it("返回 5 个角色对比项", () => {
    const result = buildRoleComparisonV13(roles);
    expect(result.length).toBe(5);
    expect(result[0].role).toBe("doctor");
    expect(result[0].callCount).toBe(100);
    expect(result[0].hitRate).toBe(80);
    expect(result[0].adoptionRate).toBe(80);
  });
});

describe("computeTotalCallsV13", () => {
  // 算式：100+50+30+20+10 = 210
  it("totalCalls = 210", () => {
    expect(computeTotalCallsV13(roles)).toBe(210);
  });
  it("空态 → 0", () => {
    expect(computeTotalCallsV13([])).toBe(0);
  });
});

describe("identifyLeadingRoleV13", () => {
  // 算式：命中率 80/85/90/75/70 → 最高 = pharmacist(90)
  it("leadingRole = pharmacist", () => {
    expect(identifyLeadingRoleV13(roles)).toBe("pharmacist");
  });
  it("空态 → null", () => {
    expect(identifyLeadingRoleV13([])).toBeNull();
  });
});

describe("museFlywheelOverviewV13Routes 读路由", () => {
  it("GET /api/v1/muse-flywheel-overview 路由存在且 auth:true", () => {
    const route = museFlywheelOverviewV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/muse-flywheel-overview",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
