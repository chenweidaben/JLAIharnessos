/**
 * 健澜科技 jlmedaios - 投诉管理明细 V13 单测（M398-A，避让旧版 complaintMgmtV13/complaintMgmtStatsV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeComplaintCountV13,
  computeComplaintHandlingTimelyRateV13,
  computeComplaintSatisfactionRateV13,
  type ComplaintMgmtDetailRecordV13,
} from "../../src/bff/aggregators/complaintMgmtDetailV13Aggregator";
import { complaintMgmtDetailV13Routes } from "../../src/bff/routes/complaintMgmtDetailV13";

const records: ComplaintMgmtDetailRecordV13[] = [
  { complaintCount: 10, timelyCount: 9, satisfiedCount: 8, handledCount: 9 },
  { complaintCount: 10, timelyCount: 9, satisfiedCount: 8, handledCount: 9 },
];

describe("computeComplaintCountV13", () => {
  // 算式：10+10 = 20
  it("投诉总数 = 20 件", () => {
    expect(computeComplaintCountV13(records)).toBe(20);
  });
  it("空态 → 0", () => {
    expect(computeComplaintCountV13([])).toBe(0);
  });
});

describe("computeComplaintHandlingTimelyRateV13", () => {
  // 算式：(9+9)/(10+10) = 18/20×100 = 90.00
  it("投诉处理及时率 = 90.00%", () => {
    expect(computeComplaintHandlingTimelyRateV13(records)).toBe(90.00);
  });
});

describe("computeComplaintSatisfactionRateV13", () => {
  // 算式：(8+8)/(9+9) = 16/18×100 = 88.89
  it("投诉满意度 = 88.89%", () => {
    expect(computeComplaintSatisfactionRateV13(records)).toBe(88.89);
  });
});

describe("complaintMgmtDetailV13Routes 读路由", () => {
  it("GET /api/v1/complaint-mgmt-detail 路由存在且 auth:true", () => {
    const route = complaintMgmtDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/complaint-mgmt-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
