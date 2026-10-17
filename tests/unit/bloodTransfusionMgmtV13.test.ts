/**
 * 健澜科技 jlmedaios - 输血管理 V13 单测（M414-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBloodTransfusionIndicationPassRateV13,
  computeBloodTransfusionReactionRateV13,
  computeBloodTransfusionRecordCompletenessRateV13,
  type BloodTransfusionMgmtRecordV13,
} from "../../src/bff/aggregators/bloodTransfusionMgmtV13Aggregator";
import { bloodTransfusionMgmtV13Routes } from "../../src/bff/routes/bloodTransfusionMgmtV13";

const records: BloodTransfusionMgmtRecordV13[] = [
  { indicationQualified: 950, transfusionTotal: 1000, reaction: 10, caseTotal: 1000, complete: 980, recordTotal: 1000 },
  { indicationQualified: 950, transfusionTotal: 1000, reaction: 10, caseTotal: 1000, complete: 980, recordTotal: 1000 },
];

describe("computeBloodTransfusionIndicationPassRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("输血适应证合格率 = 95.00%", () => {
    expect(computeBloodTransfusionIndicationPassRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeBloodTransfusionIndicationPassRateV13([])).toBe(0);
  });
});

describe("computeBloodTransfusionReactionRateV13", () => {
  // 算式：(10+10)/(1000+1000)×100 = 20/2000×100 = 1.00（反向指标，越低越好）
  it("输血反应发生率 = 1.00%（反向指标）", () => {
    expect(computeBloodTransfusionReactionRateV13(records)).toBe(1.00);
  });
});

describe("computeBloodTransfusionRecordCompletenessRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("输血记录完整率 = 98.00%", () => {
    expect(computeBloodTransfusionRecordCompletenessRateV13(records)).toBe(98.00);
  });
});

describe("bloodTransfusionMgmtV13Routes 读路由", () => {
  it("GET /api/v1/blood-transfusion-mgmt 路由存在且 auth:true", () => {
    const route = bloodTransfusionMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/blood-transfusion-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
