/**
 * 健澜科技 jlmedaios - 输血管理（细节）V13 单测（M421-C，detail 避让旧版 bloodTransfusionMgmtV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePreTransfusionCheckCompleteRateV13,
  computeTransfusionIndicationReasonableRateV13,
  computeTransfusionReactionOccurrenceRateV13,
  type BloodTransfusionDetailRecordV13,
} from "../../src/bff/aggregators/bloodTransfusionDetailV13Aggregator";
import { bloodTransfusionDetailV13Routes } from "../../src/bff/routes/bloodTransfusionDetailV13";

const records: BloodTransfusionDetailRecordV13[] = [
  { reasonableIndication: 9800, preCheckComplete: 9900, reactionOccurred: 5, transfusionTotal: 10000 },
  { reasonableIndication: 9800, preCheckComplete: 9900, reactionOccurred: 5, transfusionTotal: 10000 },
];

describe("computeTransfusionIndicationReasonableRateV13", () => {
  // 算式：(9800+9800)/(10000+10000)×100 = 19600/20000×100 = 98.00
  it("输血适应症合理率 = 98.00%", () => {
    expect(computeTransfusionIndicationReasonableRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeTransfusionIndicationReasonableRateV13([])).toBe(0);
  });
});

describe("computePreTransfusionCheckCompleteRateV13", () => {
  // 算式：(9900+9900)/(10000+10000)×100 = 19800/20000×100 = 99.00
  it("输血前检查完整率 = 99.00%", () => {
    expect(computePreTransfusionCheckCompleteRateV13(records)).toBe(99.00);
  });
});

describe("computeTransfusionReactionOccurrenceRateV13", () => {
  // 算式：(5+5)/(10000+10000)×100 = 10/20000×100 = 0.05（反向指标，越低越好）
  it("输血反应发生率 = 0.05%（反向指标）", () => {
    expect(computeTransfusionReactionOccurrenceRateV13(records)).toBe(0.05);
  });
});

describe("bloodTransfusionDetailV13Routes 读路由", () => {
  it("GET /api/v1/blood-transfusion-detail 路由存在且 auth:true", () => {
    const route = bloodTransfusionDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/blood-transfusion-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
