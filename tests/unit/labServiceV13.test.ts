/**
 * 健澜科技 jlmedaios - 检验服务 V13 单测（M374-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBiochemistryTestCountV13,
  computeBloodRoutineTestCountV13,
  computeImmunologyTestCountV13,
  type LabServiceRecordV13,
} from "../../src/bff/aggregators/labServiceV13Aggregator";
import { labServiceV13Routes } from "../../src/bff/routes/labServiceV13";

const records: LabServiceRecordV13[] = [
  { bloodRoutineCount: 500, biochemistryCount: 400, immunologyCount: 300 },
  { bloodRoutineCount: 500, biochemistryCount: 400, immunologyCount: 300 },
];

describe("computeBloodRoutineTestCountV13", () => {
  // 算式：500+500 = 1000
  it("血常规检验人次 = 1000", () => {
    expect(computeBloodRoutineTestCountV13(records)).toBe(1000);
  });
  it("空态 → 0", () => {
    expect(computeBloodRoutineTestCountV13([])).toBe(0);
  });
});

describe("computeBiochemistryTestCountV13", () => {
  // 算式：400+400 = 800
  it("生化检验人次 = 800", () => {
    expect(computeBiochemistryTestCountV13(records)).toBe(800);
  });
});

describe("computeImmunologyTestCountV13", () => {
  // 算式：300+300 = 600
  it("免疫检验人次 = 600", () => {
    expect(computeImmunologyTestCountV13(records)).toBe(600);
  });
});

describe("labServiceV13Routes 读路由", () => {
  it("GET /api/v1/lab-service 路由存在且 auth:true", () => {
    const route = labServiceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/lab-service",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
