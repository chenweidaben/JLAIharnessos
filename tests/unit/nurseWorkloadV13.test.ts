/**
 * 健澜科技 jlmedaios - 护士工作量 V13 单测（M330-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAvgNursingDaysV13,
  countNursingOperationsV13,
  type NurseWorkloadV13,
} from "../../src/bff/aggregators/nurseWorkloadV13Aggregator";
import { nurseWorkloadV13Routes } from "../../src/bff/routes/nurseWorkloadV13";

const nurses: NurseWorkloadV13[] = [
  { nurseName: "张护士", nursingDays: 30, nursingOperations: 100 },
  { nurseName: "李护士", nursingDays: 40, nursingOperations: 150 },
  { nurseName: "王护士", nursingDays: 50, nursingOperations: 50 },
];

describe("computeAvgNursingDaysV13", () => {
  // 算式：(30+40+50)/3 = 40
  it("人均床日 = 40", () => {
    expect(computeAvgNursingDaysV13(nurses)).toBe(40);
  });
  it("空态 → 0", () => {
    expect(computeAvgNursingDaysV13([])).toBe(0);
  });
});

describe("countNursingOperationsV13", () => {
  // 算式：100+150+50 = 300
  it("护理操作 = 300", () => {
    expect(countNursingOperationsV13(nurses)).toBe(300);
  });
  it("空态操作 → 0", () => {
    expect(countNursingOperationsV13([])).toBe(0);
  });
});

describe("nurseWorkloadV13Routes 读路由", () => {
  it("GET /api/v1/nurse-workload 路由存在且 auth:true", () => {
    const route = nurseWorkloadV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nurse-workload",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
