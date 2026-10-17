/**
 * 健澜科技 jlmedaios - 投诉处理 V13 单测（M340-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAvgHandleDaysV13,
  computeClosureRateV13,
  computeComplaintCountV13,
  type ComplaintRecordV13,
} from "../../src/bff/aggregators/complaintHandlingV13Aggregator";
import { complaintHandlingV13Routes } from "../../src/bff/routes/complaintHandlingV13";

const records: ComplaintRecordV13[] = [
  { complaintCount: 1, closedCount: 1, handleDays: 3 },
  { complaintCount: 1, closedCount: 1, handleDays: 5 },
  { complaintCount: 1, closedCount: 0, handleDays: 7 },
];

describe("computeComplaintCountV13", () => {
  // 算式：1+1+1 = 3
  it("投诉数 = 3", () => {
    expect(computeComplaintCountV13(records)).toBe(3);
  });
  it("空态 → 0", () => {
    expect(computeComplaintCountV13([])).toBe(0);
  });
});

describe("computeClosureRateV13", () => {
  // 算式：(1+1+0)/(1+1+1) = 2/3×100 = 66.7
  it("办结率 = 66.7%", () => {
    expect(computeClosureRateV13(records)).toBe(66.7);
  });
});

describe("computeAvgHandleDaysV13", () => {
  // 算式：(3+5+7)/3 = 15/3 = 5.0
  it("平均处理天数 = 5.0 天", () => {
    expect(computeAvgHandleDaysV13(records)).toBe(5.0);
  });
});

describe("complaintHandlingV13Routes 读路由", () => {
  it("GET /api/v1/complaint-handling 路由存在且 auth:true", () => {
    const route = complaintHandlingV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/complaint-handling",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
