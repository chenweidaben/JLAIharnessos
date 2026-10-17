/**
 * 健澜科技 jlmedaios - 输液管理（细节）V13 单测（M424-C，detail 避让旧版 infusionMgmtV13（M359-D））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInfusionPatrolArriveRateV13,
  computeInfusionPunctureSuccessRateV13,
  computeInfusionReactionOccurrenceRateV13,
  type InfusionDetailRecordV13,
} from "../../src/bff/aggregators/infusionDetailV13Aggregator";
import { infusionDetailV13Routes } from "../../src/bff/routes/infusionDetailV13";

const records: InfusionDetailRecordV13[] = [
  { reactionOccurred: 5, infusionTotal: 10000, punctureSuccess: 990, punctureTotal: 1000, patrolArrived: 980, shouldPatrolTotal: 1000 },
  { reactionOccurred: 5, infusionTotal: 10000, punctureSuccess: 990, punctureTotal: 1000, patrolArrived: 980, shouldPatrolTotal: 1000 },
];

describe("computeInfusionReactionOccurrenceRateV13", () => {
  // 算式：(5+5)/(10000+10000)×100 = 10/20000×100 = 0.05（反向指标，越低越好）
  it("输液反应发生率 = 0.05%（反向指标）", () => {
    expect(computeInfusionReactionOccurrenceRateV13(records)).toBe(0.05);
  });
  it("空态 → 0", () => {
    expect(computeInfusionReactionOccurrenceRateV13([])).toBe(0);
  });
});

describe("computeInfusionPunctureSuccessRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("输液穿刺成功率 = 99.00%", () => {
    expect(computeInfusionPunctureSuccessRateV13(records)).toBe(99.00);
  });
});

describe("computeInfusionPatrolArriveRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("输液巡视到位率 = 98.00%", () => {
    expect(computeInfusionPatrolArriveRateV13(records)).toBe(98.00);
  });
});

describe("infusionDetailV13Routes 读路由", () => {
  it("GET /api/v1/infusion-detail 路由存在且 auth:true", () => {
    const route = infusionDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/infusion-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
