/**
 * 健澜科技 jlmedaios - 医护工作量与疲劳度监测 V13 单测（M311-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessFatigueLevelV13,
  computeAvgTasksPerDayV13,
  identifyOverloadedStaffV13,
  type StaffWorkloadV13,
} from "../../src/bff/aggregators/staffWorkloadV13Aggregator";
import { staffWorkloadV13Routes } from "../../src/bff/routes/staffWorkloadV13";

const staffList: StaffWorkloadV13[] = [
  { staffId: "s1", name: "张", totalTasks: 15, workingDays: 5, overtimeHours: 4 },
  { staffId: "s2", name: "李", totalTasks: 10, workingDays: 5, overtimeHours: 2 },
  { staffId: "s3", name: "王", totalTasks: 5, workingDays: 5, overtimeHours: 0 },
];

describe("computeAvgTasksPerDayV13", () => {
  // 算式：5 任务 / 5 天 = 1.0
  it("5/5 = 1.0", () => {
    expect(computeAvgTasksPerDayV13(staffList[2])).toBe(1);
  });
  it("workingDays=0 → 0", () => {
    expect(computeAvgTasksPerDayV13({ staffId: "x", name: "x", totalTasks: 10, workingDays: 0, overtimeHours: 0 })).toBe(0);
  });
});

describe("assessFatigueLevelV13", () => {
  // 算式：totalTasks=15 > 12 → 红灯
  it("15 任务 → 红灯", () => {
    expect(assessFatigueLevelV13(staffList[0])).toBe("红灯");
  });
  // 算式：totalTasks=10 在 8-12，overtime=2 在 1-3 → 黄灯
  it("10 任务 + 2h 加班 → 黄灯", () => {
    expect(assessFatigueLevelV13(staffList[1])).toBe("黄灯");
  });
  // 算式：totalTasks=5，overtime=0 → 绿灯
  it("5 任务 + 0h → 绿灯", () => {
    expect(assessFatigueLevelV13(staffList[2])).toBe("绿灯");
  });
});

describe("identifyOverloadedStaffV13", () => {
  // 算式：只有 s1 红灯 → 过载名单 = [s1]
  it("过载 = [s1]", () => {
    expect(identifyOverloadedStaffV13(staffList).map((s) => s.staffId)).toEqual(["s1"]);
  });
  it("空态 → []", () => {
    expect(identifyOverloadedStaffV13([]).length).toBe(0);
  });
});

describe("staffWorkloadV13Routes 读路由", () => {
  it("GET /api/v1/staff-workload 路由存在且 auth:true", () => {
    const route = staffWorkloadV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/staff-workload",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
