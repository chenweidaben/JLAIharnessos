/**
 * 健澜科技 jlmedaios - 交接班管理 V13 单测（M387-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCriticalPatientBedsideHandoverRateV13,
  computeHandoverExecutionRateV13,
  computeHandoverOmissionRateV13,
  type HandoverMgmtRecordV13,
} from "../../src/bff/aggregators/handoverMgmtV13Aggregator";
import { handoverMgmtV13Routes } from "../../src/bff/routes/handoverMgmtV13";

const records: HandoverMgmtRecordV13[] = [
  { executedCount: 950, shouldCount: 1000, bedsideCount: 900, criticalPatientCount: 1000, omissionCount: 20, handoverCount: 1000 },
  { executedCount: 950, shouldCount: 1000, bedsideCount: 900, criticalPatientCount: 1000, omissionCount: 20, handoverCount: 1000 },
];

describe("computeHandoverExecutionRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("交接班执行率 = 95.00%", () => {
    expect(computeHandoverExecutionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeHandoverExecutionRateV13([])).toBe(0);
  });
});

describe("computeCriticalPatientBedsideHandoverRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("危重患者床旁交接率 = 90.00%", () => {
    expect(computeCriticalPatientBedsideHandoverRateV13(records)).toBe(90.00);
  });
});

describe("computeHandoverOmissionRateV13", () => {
  // 算式：(20+20)/(1000+1000) = 40/2000×100 = 2.00
  it("交接班遗漏率 = 2.00%", () => {
    expect(computeHandoverOmissionRateV13(records)).toBe(2.00);
  });
});

describe("handoverMgmtV13Routes 读路由", () => {
  it("GET /api/v1/handover-mgmt 路由存在且 auth:true", () => {
    const route = handoverMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/handover-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
