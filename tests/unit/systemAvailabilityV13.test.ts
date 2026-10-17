/**
 * 健澜科技 jlmedaios - 核心系统可用率 V13 单测（M344-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEMRAvailabilityV13,
  computeHISAvailabilityV13,
  computeLISAvailabilityV13,
  computePACSAvailabilityV13,
  type SystemAvailabilityRecordV13,
} from "../../src/bff/aggregators/systemAvailabilityV13Aggregator";
import { systemAvailabilityV13Routes } from "../../src/bff/routes/systemAvailabilityV13";

const records: SystemAvailabilityRecordV13[] = [
  {
    hisAvailableMinutes: 21600,
    hisTotalMinutes: 21600,
    emrAvailableMinutes: 21500,
    emrTotalMinutes: 21600,
    lisAvailableMinutes: 21400,
    lisTotalMinutes: 21600,
    pacsAvailableMinutes: 21550,
    pacsTotalMinutes: 21600,
  },
  {
    hisAvailableMinutes: 21600,
    hisTotalMinutes: 21600,
    emrAvailableMinutes: 21500,
    emrTotalMinutes: 21600,
    lisAvailableMinutes: 21400,
    lisTotalMinutes: 21600,
    pacsAvailableMinutes: 21550,
    pacsTotalMinutes: 21600,
  },
];

describe("computeHISAvailabilityV13", () => {
  // 算式：(21600+21600)/(21600+21600) = 43200/43200×100 = 100.00
  it("HIS 月度可用率 = 100.00%", () => {
    expect(computeHISAvailabilityV13(records)).toBe(100.00);
  });
  it("空态 → 0", () => {
    expect(computeHISAvailabilityV13([])).toBe(0);
  });
});

describe("computeEMRAvailabilityV13", () => {
  // 算式：(21500+21500)/(21600+21600) = 43000/43200×100 = 99.54
  it("EMR 月度可用率 = 99.54%", () => {
    expect(computeEMRAvailabilityV13(records)).toBe(99.54);
  });
});

describe("computeLISAvailabilityV13", () => {
  // 算式：(21400+21400)/(21600+21600) = 42800/43200×100 = 99.07
  it("LIS 月度可用率 = 99.07%", () => {
    expect(computeLISAvailabilityV13(records)).toBe(99.07);
  });
});

describe("computePACSAvailabilityV13", () => {
  // 算式：(21550+21550)/(21600+21600) = 43100/43200×100 = 99.77
  it("PACS 月度可用率 = 99.77%", () => {
    expect(computePACSAvailabilityV13(records)).toBe(99.77);
  });
});

describe("systemAvailabilityV13Routes 读路由", () => {
  it("GET /api/v1/system-availability 路由存在且 auth:true", () => {
    const route = systemAvailabilityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/system-availability",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
