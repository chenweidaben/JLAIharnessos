/**
 * 健澜科技 jlmedaios - 输血质量管理 V13 单测（M430-D，M430 收官，-quality 后缀避让旧版 bloodTransfusionDetailV13（M421））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBloodTransfusionIndicationAppropriateRateV13,
  computeBloodTransfusionPreCheckCompleteRateV13,
  computeBloodTransfusionReactionOccurrenceRateV13,
  type BloodTransfusionQualityMgmtRecordV13,
} from "../../src/bff/aggregators/bloodTransfusionQualityMgmtV13Aggregator";
import { bloodTransfusionQualityMgmtV13Routes } from "../../src/bff/routes/bloodTransfusionQualityMgmtV13";

const records: BloodTransfusionQualityMgmtRecordV13[] = [
  { indicationAppropriate: 9800, preCheckComplete: 9900, reactionOccurrence: 20, transfusionTotal: 10000 },
  { indicationAppropriate: 9800, preCheckComplete: 9900, reactionOccurrence: 20, transfusionTotal: 10000 },
];

describe("computeBloodTransfusionIndicationAppropriateRateV13", () => {
  // 算式：(9800+9800)/(10000+10000)×100 = 19600/20000×100 = 98.00
  it("输血适应症合理率 = 98.00%", () => {
    expect(computeBloodTransfusionIndicationAppropriateRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeBloodTransfusionIndicationAppropriateRateV13([])).toBe(0);
  });
});

describe("computeBloodTransfusionPreCheckCompleteRateV13", () => {
  // 算式：(9900+9900)/(10000+10000)×100 = 19800/20000×100 = 99.00
  it("输血前检查完整率 = 99.00%", () => {
    expect(computeBloodTransfusionPreCheckCompleteRateV13(records)).toBe(99.00);
  });
});

describe("computeBloodTransfusionReactionOccurrenceRateV13", () => {
  // 算式：(20+20)/(10000+10000)×100 = 40/20000×100 = 0.20%（反向指标）
  it("输血反应发生率 = 0.20%（反向指标）", () => {
    expect(computeBloodTransfusionReactionOccurrenceRateV13(records)).toBe(0.20);
  });
});

describe("bloodTransfusionQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/blood-transfusion-quality-mgmt 路由存在且 auth:true", () => {
    const route = bloodTransfusionQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/blood-transfusion-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
