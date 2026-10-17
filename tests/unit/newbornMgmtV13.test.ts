/**
 * 健澜科技 jlmedaios - 新生儿管理 V13 单测（M412-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeNewbornApgarPassRateV13,
  computeNewbornAsphyxiaRateV13,
  computeNewbornVisitRateV13,
  type NewbornMgmtRecordV13,
} from "../../src/bff/aggregators/newbornMgmtV13Aggregator";
import { newbornMgmtV13Routes } from "../../src/bff/routes/newbornMgmtV13";

const records: NewbornMgmtRecordV13[] = [
  { apgarPass: 980, visited: 950, asphyxia: 15, newbornTotal: 1000 },
  { apgarPass: 980, visited: 950, asphyxia: 15, newbornTotal: 1000 },
];

describe("computeNewbornApgarPassRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("Apgar评分合格率 = 98.00%", () => {
    expect(computeNewbornApgarPassRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeNewbornApgarPassRateV13([])).toBe(0);
  });
});

describe("computeNewbornVisitRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("新生儿访视率 = 95.00%", () => {
    expect(computeNewbornVisitRateV13(records)).toBe(95.00);
  });
});

describe("computeNewbornAsphyxiaRateV13", () => {
  // 算式：(15+15)/(1000+1000)×100 = 30/2000×100 = 1.50
  it("新生儿窒息发生率 = 1.50%", () => {
    expect(computeNewbornAsphyxiaRateV13(records)).toBe(1.50);
  });
});

describe("newbornMgmtV13Routes 读路由", () => {
  it("GET /api/v1/newborn-mgmt 路由存在且 auth:true", () => {
    const route = newbornMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/newborn-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
