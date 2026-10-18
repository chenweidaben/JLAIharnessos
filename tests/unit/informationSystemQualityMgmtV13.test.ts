/**
 * 健澜科技 jlmedaios - 信息系统质量管理 V13 单测（M432-A，-quality 后缀避让旧版 informationSystemMgmtV13（M409））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeSystemAvailabilityRateV13,
  computeSystemFailureRateV13,
  computeSystemResponseTimeMinutesV13,
  type InformationSystemQualityMgmtRecordV13,
} from "../../src/bff/aggregators/informationSystemQualityMgmtV13Aggregator";
import { informationSystemQualityMgmtV13Routes } from "../../src/bff/routes/informationSystemQualityMgmtV13";

const records: InformationSystemQualityMgmtRecordV13[] = [
  { availableMinutes: 9800, requiredMinutes: 10000, responseMinutes: 2.5, failureCount: 20, runTotal: 10000 },
  { availableMinutes: 9800, requiredMinutes: 10000, responseMinutes: 3.4, failureCount: 20, runTotal: 10000 },
];

describe("computeSystemAvailabilityRateV13", () => {
  // 算式：(9800+9800)/(10000+10000)×100 = 19600/20000×100 = 98.00
  it("系统可用率 = 98.00%", () => {
    expect(computeSystemAvailabilityRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeSystemAvailabilityRateV13([])).toBe(0);
  });
});

describe("computeSystemResponseTimeMinutesV13", () => {
  // 算式：avg = (2.5+3.4)/2 = 2.95，Math.ceil(2.95) = 3 分钟（Math.ceil 整分钟）
  it("系统响应时间 = 3 分钟（Math.ceil 整分钟）", () => {
    expect(computeSystemResponseTimeMinutesV13(records)).toBe(3);
  });
});

describe("computeSystemFailureRateV13", () => {
  // 算式：(20+20)/(10000+10000)×100 = 40/20000×100 = 0.20%（反向指标）
  it("系统故障率 = 0.20%（反向指标）", () => {
    expect(computeSystemFailureRateV13(records)).toBe(0.20);
  });
});

describe("informationSystemQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/information-system-quality-mgmt 路由存在且 auth:true", () => {
    const route = informationSystemQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/information-system-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
