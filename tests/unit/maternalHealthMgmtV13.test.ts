/**
 * 健澜科技 jlmedaios - 孕产妇系统管理 V13 单测（M442-A，妇幼健康与计划生育管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMaternalHealthPostnatalVisitRateV13,
  computeMaternalHealthRecordRateV13,
  computeMaternalHealthSystemRateV13,
  type MaternalHealthMgmtRecordV13,
} from "../../src/bff/aggregators/maternalHealthMgmtV13Aggregator";
import { maternalHealthMgmtV13Routes } from "../../src/bff/routes/maternalHealthMgmtV13";

const records: MaternalHealthMgmtRecordV13[] = [
  { registeredMaternal: 950, totalMaternal: 1000, systemManaged: 900, visitedPostnatal: 980, shouldVisitPostnatal: 1000 },
  { registeredMaternal: 950, totalMaternal: 1000, systemManaged: 900, visitedPostnatal: 980, shouldVisitPostnatal: 1000 },
];

describe("computeMaternalHealthRecordRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("孕产妇建册率 = 95.00%", () => {
    expect(computeMaternalHealthRecordRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeMaternalHealthRecordRateV13([])).toBe(0);
  });
});

describe("computeMaternalHealthSystemRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("系统管理率 = 90.00%", () => {
    expect(computeMaternalHealthSystemRateV13(records)).toBe(90.00);
  });
});

describe("computeMaternalHealthPostnatalVisitRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("产后访视率 = 98.00%", () => {
    expect(computeMaternalHealthPostnatalVisitRateV13(records)).toBe(98.00);
  });
});

describe("maternalHealthMgmtV13Routes 读路由", () => {
  it("GET /api/v1/maternal-health-mgmt 路由存在且 auth:true", () => {
    const route = maternalHealthMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/maternal-health-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
