/**
 * 健澜科技 jlmedaios - 门诊流程管理 V13 单测（M454-A，门急诊与手术麻醉管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeOutpatientProcessAppointmentRateV13,
  computeOutpatientProcessRevisitRateV13,
  computeOutpatientProcessWaitingMinutesV13,
  type OutpatientProcessMgmtRecordV13,
} from "../../src/bff/aggregators/outpatientProcessMgmtV13Aggregator";
import { outpatientProcessMgmtV13Routes } from "../../src/bff/routes/outpatientProcessMgmtV13";

const records: OutpatientProcessMgmtRecordV13[] = [
  { appointed: 950, totalVisit: 1000, waitingMinutes: 14.3, revisit: 900 },
  { appointed: 950, totalVisit: 1000, waitingMinutes: 15.2, revisit: 900 },
];

describe("computeOutpatientProcessAppointmentRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("门诊预约率 = 95.00%", () => {
    expect(computeOutpatientProcessAppointmentRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientProcessAppointmentRateV13([])).toBe(0);
  });
});

describe("computeOutpatientProcessWaitingMinutesV13", () => {
  // 算式：avg = (14.3+15.2)/2 = 29.5/2 = 14.75 → Math.ceil(14.75) = 15 分钟
  it("门诊候诊时长 = 15 分钟（Math.ceil 整分钟）", () => {
    expect(computeOutpatientProcessWaitingMinutesV13(records)).toBe(15);
  });
});

describe("computeOutpatientProcessRevisitRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("门诊复诊率 = 90.00%", () => {
    expect(computeOutpatientProcessRevisitRateV13(records)).toBe(90.00);
  });
});

describe("outpatientProcessMgmtV13Routes 读路由", () => {
  it("GET /api/v1/outpatient-process-mgmt 路由存在且 auth:true", () => {
    const route = outpatientProcessMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/outpatient-process-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
