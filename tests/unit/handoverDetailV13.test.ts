/**
 * 健澜科技 jlmedaios - 交接班管理（细节）V13 单测（M413-C，detail 避让旧版 handoverMgmtV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBedsideHandoverExecutionRateV13,
  computeHandoverMissedItemRateV13,
  computeHandoverWritingCompletenessRateV13,
  type HandoverDetailRecordV13,
} from "../../src/bff/aggregators/handoverDetailV13Aggregator";
import { handoverDetailV13Routes } from "../../src/bff/routes/handoverDetailV13";

const records: HandoverDetailRecordV13[] = [
  { complete: 950, total: 1000, executed: 980, shouldTotal: 1000, missed: 10, handoverTotal: 1000 },
  { complete: 950, total: 1000, executed: 980, shouldTotal: 1000, missed: 10, handoverTotal: 1000 },
];

describe("computeHandoverWritingCompletenessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("交接班书写完整率 = 95.00%", () => {
    expect(computeHandoverWritingCompletenessRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeHandoverWritingCompletenessRateV13([])).toBe(0);
  });
});

describe("computeBedsideHandoverExecutionRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("床旁交接执行率 = 98.00%", () => {
    expect(computeBedsideHandoverExecutionRateV13(records)).toBe(98.00);
  });
});

describe("computeHandoverMissedItemRateV13", () => {
  // 算式：(10+10)/(1000+1000)×100 = 20/2000×100 = 1.00（反向指标，越低越好）
  it("交接漏项率 = 1.00%（反向指标）", () => {
    expect(computeHandoverMissedItemRateV13(records)).toBe(1.00);
  });
});

describe("handoverDetailV13Routes 读路由", () => {
  it("GET /api/v1/handover-detail 路由存在且 auth:true", () => {
    const route = handoverDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/handover-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
