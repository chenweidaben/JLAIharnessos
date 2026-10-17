/**
 * 健澜科技 jlmedaios - 投诉管理（统计）V13 单测（M365-B，stats避让）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeComplaintResolveRateV13,
  computeComplaintTimelyRateV13,
  computeRepeatComplaintRateV13,
  type ComplaintMgmtStatsRecordV13,
} from "../../src/bff/aggregators/complaintMgmtStatsV13Aggregator";
import { complaintMgmtStatsV13Routes } from "../../src/bff/routes/complaintMgmtStatsV13";

const records: ComplaintMgmtStatsRecordV13[] = [
  { complaintCount: 100, timelyProcessed: 95, resolved: 90, repeated: 5 },
  { complaintCount: 100, timelyProcessed: 95, resolved: 90, repeated: 5 },
];

describe("computeComplaintTimelyRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("投诉处理及时率 = 95.00%", () => {
    expect(computeComplaintTimelyRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeComplaintTimelyRateV13([])).toBe(0);
  });
});

describe("computeComplaintResolveRateV13", () => {
  // 算式：(90+90)/(100+100) = 180/200×100 = 90.00
  it("投诉解决率 = 90.00%", () => {
    expect(computeComplaintResolveRateV13(records)).toBe(90.00);
  });
});

describe("computeRepeatComplaintRateV13", () => {
  // 算式：(5+5)/(100+100) = 10/200×100 = 5.00
  it("重复投诉率 = 5.00%", () => {
    expect(computeRepeatComplaintRateV13(records)).toBe(5.00);
  });
});

describe("complaintMgmtStatsV13Routes 读路由", () => {
  it("GET /api/v1/complaint-mgmt-stats 路由存在且 auth:true", () => {
    const route = complaintMgmtStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/complaint-mgmt-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
