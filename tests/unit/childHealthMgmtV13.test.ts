/**
 * 健澜科技 jlmedaios - 儿童保健管理 V13 单测（M442-B，妇幼健康与计划生育管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeChildHealthGrowthMonitoringRateV13,
  computeChildHealthManagementRateV13,
  computeChildHealthNewbornVisitRateV13,
  type ChildHealthMgmtRecordV13,
} from "../../src/bff/aggregators/childHealthMgmtV13Aggregator";
import { childHealthMgmtV13Routes } from "../../src/bff/routes/childHealthMgmtV13";

const records: ChildHealthMgmtRecordV13[] = [
  { managedChild: 950, totalChild: 1000, visitedNewborn: 980, totalNewborn: 1000, monitoredChild: 900, shouldMonitorChild: 1000 },
  { managedChild: 950, totalChild: 1000, visitedNewborn: 980, totalNewborn: 1000, monitoredChild: 900, shouldMonitorChild: 1000 },
];

describe("computeChildHealthManagementRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("0-6岁儿童健康管理率 = 95.00%", () => {
    expect(computeChildHealthManagementRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeChildHealthManagementRateV13([])).toBe(0);
  });
});

describe("computeChildHealthNewbornVisitRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("新生儿访视率 = 98.00%", () => {
    expect(computeChildHealthNewbornVisitRateV13(records)).toBe(98.00);
  });
});

describe("computeChildHealthGrowthMonitoringRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("生长发育监测率 = 90.00%", () => {
    expect(computeChildHealthGrowthMonitoringRateV13(records)).toBe(90.00);
  });
});

describe("childHealthMgmtV13Routes 读路由", () => {
  it("GET /api/v1/child-health-mgmt 路由存在且 auth:true", () => {
    const route = childHealthMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/child-health-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
