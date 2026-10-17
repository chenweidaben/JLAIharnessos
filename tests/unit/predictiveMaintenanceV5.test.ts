/**
 * 健澜科技 jlmedaios - 设备预测性维护 V5 单测（M279-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPredictiveMaintenanceV5Report,
  calculateMTBFV5,
  predictFailureV5,
  scheduleMaintenanceV5,
  type Equipment,
} from "../../src/bff/aggregators/predictiveMaintenanceV5Aggregator";

const eq: Equipment = {
  equipmentId: "ct-01",
  name: "CT",
  installDate: "2022-01-01",
  warrantyExpiry: "2027-01-01",
  runtimeHours: 2500,
  lastFailureHours: 1600,
  nextServiceDue: 3000,
};

describe("predictFailureV5", () => {
  it("距上次故障900小时/间隔1000→90%→高风险", () => {
    const r = predictFailureV5(eq, 1000);
    expect(r.risk).toBe("high");
  });
  it("距上次故障500小时→50%→低风险", () => {
    const r = predictFailureV5({ ...eq, runtimeHours: 2100 }, 1000);
    expect(r.risk).toBe("low");
  });
});

describe("scheduleMaintenanceV5", () => {
  it("高风险设备→优先级1", () => {
    expect(scheduleMaintenanceV5(eq, 1000).priority).toBe(1);
  });
});

describe("calculateMTBFV5", () => {
  it("运行10000小时故障5次→MTBF=2000", () => {
    expect(calculateMTBFV5(10000, 5)).toBe(2000);
  });
  it("无故障→MTBF=总运行小时", () => {
    expect(calculateMTBFV5(5000, 0)).toBe(5000);
  });
});

describe("buildPredictiveMaintenanceV5Report", () => {
  it("统计高风险与超期设备", () => {
    const list: Equipment[] = [
      eq,
      { ...eq, equipmentId: "mr-01", runtimeHours: 3200, lastFailureHours: 2100, nextServiceDue: 3100 },
    ];
    const r = buildPredictiveMaintenanceV5Report(list, 1000);
    // mr-01: sinceLast=1100 >= 900 → high; nextServiceDue=3100 < runtime=3200 → overdue
    expect(r.highRiskCount).toBe(2);
    expect(r.overdueCount).toBe(1);
  });
});
