/**
 * 健澜科技 jlmedaios - 消毒灭菌管理 V13 单测（M423-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDisinfectionEffectMonitoringPassRateV13,
  computeSterilizationPassRateV13,
  computeSterileStorageComplianceRateV13,
  type SterilizationMgmtRecordV13,
} from "../../src/bff/aggregators/sterilizationMgmtV13Aggregator";
import { sterilizationMgmtV13Routes } from "../../src/bff/routes/sterilizationMgmtV13";

const records: SterilizationMgmtRecordV13[] = [
  { passBatch: 990, totalBatch: 1000, passMonitor: 980, totalMonitor: 1000, compliantPoint: 970, totalPoint: 1000 },
  { passBatch: 990, totalBatch: 1000, passMonitor: 980, totalMonitor: 1000, compliantPoint: 970, totalPoint: 1000 },
];

describe("computeSterilizationPassRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("灭菌合格率 = 99.00%", () => {
    expect(computeSterilizationPassRateV13(records)).toBe(99.00);
  });
  it("空态 → 0", () => {
    expect(computeSterilizationPassRateV13([])).toBe(0);
  });
});

describe("computeDisinfectionEffectMonitoringPassRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("消毒效果监测合格率 = 98.00%", () => {
    expect(computeDisinfectionEffectMonitoringPassRateV13(records)).toBe(98.00);
  });
});

describe("computeSterileStorageComplianceRateV13", () => {
  // 算式：(970+970)/(1000+1000)×100 = 1940/2000×100 = 97.00
  it("无菌物品存放合规率 = 97.00%", () => {
    expect(computeSterileStorageComplianceRateV13(records)).toBe(97.00);
  });
});

describe("sterilizationMgmtV13Routes 读路由", () => {
  it("GET /api/v1/sterilization-mgmt 路由存在且 auth:true", () => {
    const route = sterilizationMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/sterilization-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
