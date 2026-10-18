/**
 * 健澜科技 jlmedaios - 投诉处理管理 V13 单测（M451-B，医患关系与投诉管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeComplaintHandlingAcceptanceTimelinessRateV13,
  computeComplaintHandlingClosureRateV13,
  computeComplaintHandlingSatisfactionRateV13,
  type ComplaintHandlingMgmtRecordV13,
} from "../../src/bff/aggregators/complaintHandlingMgmtV13Aggregator";
import { complaintHandlingMgmtV13Routes } from "../../src/bff/routes/complaintHandlingMgmtV13";

const records: ComplaintHandlingMgmtRecordV13[] = [
  { timelyAccept: 950, totalComplaint: 1000, closed: 900, satisfied: 980, totalClosed: 1000 },
  { timelyAccept: 950, totalComplaint: 1000, closed: 900, satisfied: 980, totalClosed: 1000 },
];

describe("computeComplaintHandlingAcceptanceTimelinessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("投诉受理及时率 = 95.00%", () => {
    expect(computeComplaintHandlingAcceptanceTimelinessRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeComplaintHandlingAcceptanceTimelinessRateV13([])).toBe(0);
  });
});

describe("computeComplaintHandlingClosureRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("投诉办结率 = 90.00%", () => {
    expect(computeComplaintHandlingClosureRateV13(records)).toBe(90.00);
  });
});

describe("computeComplaintHandlingSatisfactionRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("投诉满意率 = 98.00%", () => {
    expect(computeComplaintHandlingSatisfactionRateV13(records)).toBe(98.00);
  });
});

describe("complaintHandlingMgmtV13Routes 读路由", () => {
  it("GET /api/v1/complaint-handling-mgmt 路由存在且 auth:true", () => {
    const route = complaintHandlingMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/complaint-handling-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
