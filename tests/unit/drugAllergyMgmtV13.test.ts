/**
 * 健澜科技 jlmedaios - 药品过敏管理 V13 单测（M388-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAllergyHistoryRegistrationRateV13,
  computeAllergyReactionHandlingRateV13,
  computeSkinTestExecutionRateV13,
  type DrugAllergyMgmtRecordV13,
} from "../../src/bff/aggregators/drugAllergyMgmtV13Aggregator";
import { drugAllergyMgmtV13Routes } from "../../src/bff/routes/drugAllergyMgmtV13";

const records: DrugAllergyMgmtRecordV13[] = [
  { registeredCount: 950, shouldRegisterCount: 1000, executedCount: 900, shouldExecuteCount: 1000, handledCount: 190, reactionCount: 200 },
  { registeredCount: 950, shouldRegisterCount: 1000, executedCount: 900, shouldExecuteCount: 1000, handledCount: 190, reactionCount: 200 },
];

describe("computeAllergyHistoryRegistrationRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("过敏史登记率 = 95.00%", () => {
    expect(computeAllergyHistoryRegistrationRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeAllergyHistoryRegistrationRateV13([])).toBe(0);
  });
});

describe("computeSkinTestExecutionRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("皮试执行率 = 90.00%", () => {
    expect(computeSkinTestExecutionRateV13(records)).toBe(90.00);
  });
});

describe("computeAllergyReactionHandlingRateV13", () => {
  // 算式：(190+190)/(200+200) = 380/400×100 = 95.00
  it("过敏反应处置率 = 95.00%", () => {
    expect(computeAllergyReactionHandlingRateV13(records)).toBe(95.00);
  });
});

describe("drugAllergyMgmtV13Routes 读路由", () => {
  it("GET /api/v1/drug-allergy-mgmt 路由存在且 auth:true", () => {
    const route = drugAllergyMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/drug-allergy-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
