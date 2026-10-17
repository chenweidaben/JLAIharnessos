/**
 * 健澜科技 jlmedaios - 投诉管理 V13 单测（M354-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeClosureRateV13,
  computeFollowUpSatisfactionV13,
  computeRepeatComplaintRateV13,
  type ComplaintMgmtRecordV13,
} from "../../src/bff/aggregators/complaintMgmtV13Aggregator";
import { complaintMgmtV13Routes } from "../../src/bff/routes/complaintMgmtV13";

const records: ComplaintMgmtRecordV13[] = [
  { complaintCount: 100, closedCount: 95, followUpSatisfaction: 4.5, repeatComplaintCount: 5 },
  { complaintCount: 100, closedCount: 90, followUpSatisfaction: 4.7, repeatComplaintCount: 3 },
];

describe("computeClosureRateV13", () => {
  // 算式：(95+90)/(100+100) = 185/200×100 = 92.50
  it("投诉办结率 = 92.50%", () => {
    expect(computeClosureRateV13(records)).toBe(92.50);
  });
  it("空态 → 0", () => {
    expect(computeClosureRateV13([])).toBe(0);
  });
});

describe("computeFollowUpSatisfactionV13", () => {
  // 算式：(4.5+4.7)/2 = 9.2/2 = 4.60
  it("投诉回访满意度 = 4.60", () => {
    expect(computeFollowUpSatisfactionV13(records)).toBe(4.60);
  });
});

describe("computeRepeatComplaintRateV13", () => {
  // 算式：(5+3)/(100+100) = 8/200×100 = 4.00
  it("重复投诉率 = 4.00%", () => {
    expect(computeRepeatComplaintRateV13(records)).toBe(4.00);
  });
});

describe("complaintMgmtV13Routes 读路由", () => {
  it("GET /api/v1/complaint-mgmt 路由存在且 auth:true", () => {
    const route = complaintMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/complaint-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
