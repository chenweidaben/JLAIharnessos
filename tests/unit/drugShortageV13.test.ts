/**
 * 健澜科技 jlmedaios - 药品短缺 V13 单测（M336-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAffectedPatientsV13,
  computeAvgShortageDaysV13,
  computeShortageCountV13,
  type DrugShortageRecordV13,
} from "../../src/bff/aggregators/drugShortageV13Aggregator";
import { drugShortageV13Routes } from "../../src/bff/routes/drugShortageV13";

const records: DrugShortageRecordV13[] = [
  { shortageDays: 5, affectedPatients: 100 },
  { shortageDays: 3, affectedPatients: 50 },
  { shortageDays: 7, affectedPatients: 20 },
];

describe("computeShortageCountV13", () => {
  // 算式：3 个品种
  it("短缺品种数 = 3", () => {
    expect(computeShortageCountV13(records)).toBe(3);
  });
  it("空态 → 0", () => {
    expect(computeShortageCountV13([])).toBe(0);
  });
});

describe("computeAvgShortageDaysV13", () => {
  // 算式：(5+3+7)/3 = 15/3 = 5.0
  it("平均缺货天数 = 5.0 天", () => {
    expect(computeAvgShortageDaysV13(records)).toBe(5.0);
  });
});

describe("computeAffectedPatientsV13", () => {
  // 算式：100+50+20 = 170
  it("影响人次 = 170", () => {
    expect(computeAffectedPatientsV13(records)).toBe(170);
  });
});

describe("drugShortageV13Routes 读路由", () => {
  it("GET /api/v1/drug-shortage 路由存在且 auth:true", () => {
    const route = drugShortageV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/drug-shortage",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
