/**
 * 健澜科技 jlmedaios - 孕产妇管理 V13 单测（M412-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCesareanSectionRateV13,
  computeMaternalSystemMgmtRateV13,
  computePostpartumVisitRateV13,
  type MaternalMgmtRecordV13,
} from "../../src/bff/aggregators/maternalMgmtV13Aggregator";
import { maternalMgmtV13Routes } from "../../src/bff/routes/maternalMgmtV13";

const records: MaternalMgmtRecordV13[] = [
  { systemManaged: 950, maternalTotal: 1000, visited: 980, postpartumTotal: 1000, cesarean: 300, deliveryTotal: 1000 },
  { systemManaged: 950, maternalTotal: 1000, visited: 980, postpartumTotal: 1000, cesarean: 300, deliveryTotal: 1000 },
];

describe("computeMaternalSystemMgmtRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("孕产妇系统管理率 = 95.00%", () => {
    expect(computeMaternalSystemMgmtRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeMaternalSystemMgmtRateV13([])).toBe(0);
  });
});

describe("computePostpartumVisitRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("产后访视率 = 98.00%", () => {
    expect(computePostpartumVisitRateV13(records)).toBe(98.00);
  });
});

describe("computeCesareanSectionRateV13", () => {
  // 算式：(300+300)/(1000+1000)×100 = 600/2000×100 = 30.00
  it("剖宫产率 = 30.00%", () => {
    expect(computeCesareanSectionRateV13(records)).toBe(30.00);
  });
});

describe("maternalMgmtV13Routes 读路由", () => {
  it("GET /api/v1/maternal-mgmt 路由存在且 auth:true", () => {
    const route = maternalMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/maternal-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
