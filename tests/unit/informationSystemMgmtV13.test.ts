/**
 * 健澜科技 jlmedaios - 信息系统管理 V13 单测（M409-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHISAvailabilityRateV13,
  computeLISAvailabilityRateV13,
  computePACSAvailabilityRateV13,
  type InformationSystemMgmtRecordV13,
} from "../../src/bff/aggregators/informationSystemMgmtV13Aggregator";
import { informationSystemMgmtV13Routes } from "../../src/bff/routes/informationSystemMgmtV13";

const records: InformationSystemMgmtRecordV13[] = [
  { hisUptime: 980, hisTotal: 1000, lisUptime: 970, lisTotal: 1000, pacsUptime: 990, pacsTotal: 1000 },
  { hisUptime: 980, hisTotal: 1000, lisUptime: 970, lisTotal: 1000, pacsUptime: 990, pacsTotal: 1000 },
];

describe("computeHISAvailabilityRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("HIS系统可用率 = 98.00%", () => {
    expect(computeHISAvailabilityRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeHISAvailabilityRateV13([])).toBe(0);
  });
});

describe("computeLISAvailabilityRateV13", () => {
  // 算式：(970+970)/(1000+1000)×100 = 1940/2000×100 = 97.00
  it("LIS系统可用率 = 97.00%", () => {
    expect(computeLISAvailabilityRateV13(records)).toBe(97.00);
  });
});

describe("computePACSAvailabilityRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("PACS系统可用率 = 99.00%", () => {
    expect(computePACSAvailabilityRateV13(records)).toBe(99.00);
  });
});

describe("informationSystemMgmtV13Routes 读路由", () => {
  it("GET /api/v1/information-system-mgmt 路由存在且 auth:true", () => {
    const route = informationSystemMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/information-system-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
