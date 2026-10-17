/**
 * 健澜科技 jlmedaios - 院感发生率 V13 单测（M341-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInfectionRatePer1000BedDaysV13,
  type NosocomialInfectionRecordV13,
} from "../../src/bff/aggregators/nosocomialInfectionV13Aggregator";
import { nosocomialInfectionV13Routes } from "../../src/bff/routes/nosocomialInfectionV13";

const records: NosocomialInfectionRecordV13[] = [
  { bedDays: 2000, infectionCount: 10 },
];

describe("computeInfectionRatePer1000BedDaysV13", () => {
  // 算式：10×1000/2000 = 5.0
  it("千住院日院感次数 = 5.0‰", () => {
    expect(computeInfectionRatePer1000BedDaysV13(records)).toBe(5.0);
  });
  it("空态 → 0", () => {
    expect(computeInfectionRatePer1000BedDaysV13([])).toBe(0);
  });
  it("总住院天数为 0 → 0", () => {
    const zeroRecords: NosocomialInfectionRecordV13[] = [
      { bedDays: 0, infectionCount: 0 },
    ];
    expect(computeInfectionRatePer1000BedDaysV13(zeroRecords)).toBe(0);
  });
});

describe("nosocomialInfectionV13Routes 读路由", () => {
  it("GET /api/v1/nosocomial-infection 路由存在且 auth:true", () => {
    const route = nosocomialInfectionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nosocomial-infection",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
