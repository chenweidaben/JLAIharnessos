/**
 * 健澜科技 jlmedaios - 院感报告管理 V13 单测（M412-D，M412 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInfectionMissedReportRateV13,
  computeInfectionOutbreakResponseTimeV13,
  computeInfectionReportTimelyRateV13,
  type InfectionReportMgmtRecordV13,
} from "../../src/bff/aggregators/infectionReportMgmtV13Aggregator";
import { infectionReportMgmtV13Routes } from "../../src/bff/routes/infectionReportMgmtV13";

const records: InfectionReportMgmtRecordV13[] = [
  { timely: 980, total: 1000, missed: 10, shouldTotal: 1000, responseTime: 2.5 },
  { timely: 980, total: 1000, missed: 10, shouldTotal: 1000, responseTime: 2.5 },
];

describe("computeInfectionReportTimelyRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("院感病例报告及时率 = 98.00%", () => {
    expect(computeInfectionReportTimelyRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeInfectionReportTimelyRateV13([])).toBe(0);
  });
});

describe("computeInfectionMissedReportRateV13", () => {
  // 算式：(10+10)/(1000+1000)×100 = 20/2000×100 = 1.00
  it("院感漏报率 = 1.00%", () => {
    expect(computeInfectionMissedReportRateV13(records)).toBe(1.00);
  });
});

describe("computeInfectionOutbreakResponseTimeV13", () => {
  // 算式：(2.5+2.5)/2 = 2.5 → Math.ceil(2.5) = 3 小时（直接 Math.ceil(avg)，不用 Math.ceil(avg*100)/100）
  it("暴发事件响应时长 = 3 小时（Math.ceil 整小时）", () => {
    expect(computeInfectionOutbreakResponseTimeV13(records)).toBe(3);
  });
});

describe("infectionReportMgmtV13Routes 读路由", () => {
  it("GET /api/v1/infection-report-mgmt 路由存在且 auth:true", () => {
    const route = infectionReportMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/infection-report-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
