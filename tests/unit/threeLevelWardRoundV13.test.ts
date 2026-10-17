/**
 * 健澜科技 jlmedaios - 三级查房管理 V13 单测（M404-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAttendingPhysicianWardRoundRateV13,
  computeChiefPhysicianWardRoundRateV13,
  computeResidentPhysicianWardRoundRateV13,
  type ThreeLevelWardRoundRecordV13,
} from "../../src/bff/aggregators/threeLevelWardRoundV13Aggregator";
import { threeLevelWardRoundV13Routes } from "../../src/bff/routes/threeLevelWardRoundV13";

const records: ThreeLevelWardRoundRecordV13[] = [
  { chiefDone: 95, chiefTotal: 100, attendingDone: 98, attendingTotal: 100, residentDone: 100, residentTotal: 100 },
  { chiefDone: 95, chiefTotal: 100, attendingDone: 98, attendingTotal: 100, residentDone: 100, residentTotal: 100 },
];

describe("computeChiefPhysicianWardRoundRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("主任医师查房率 = 95.00%", () => {
    expect(computeChiefPhysicianWardRoundRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeChiefPhysicianWardRoundRateV13([])).toBe(0);
  });
});

describe("computeAttendingPhysicianWardRoundRateV13", () => {
  // 算式：(98+98)/(100+100) = 196/200×100 = 98.00
  it("主治医师查房率 = 98.00%", () => {
    expect(computeAttendingPhysicianWardRoundRateV13(records)).toBe(98.00);
  });
});

describe("computeResidentPhysicianWardRoundRateV13", () => {
  // 算式：(100+100)/(100+100) = 200/200×100 = 100.00
  it("住院医师查房率 = 100.00%", () => {
    expect(computeResidentPhysicianWardRoundRateV13(records)).toBe(100.00);
  });
});

describe("threeLevelWardRoundV13Routes 读路由", () => {
  it("GET /api/v1/three-level-ward-round 路由存在且 auth:true", () => {
    const route = threeLevelWardRoundV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/three-level-ward-round",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
