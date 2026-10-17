/**
 * 健澜科技 jlmedaios - 死亡病例管理 V13 单测（M412-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDeathCaseDiscussionRateV13,
  computeDeathCauseRegistrationPassRateV13,
  computeDeathReportTimelyRateV13,
  type DeathReportMgmtRecordV13,
} from "../../src/bff/aggregators/deathReportMgmtV13Aggregator";
import { deathReportMgmtV13Routes } from "../../src/bff/routes/deathReportMgmtV13";

const records: DeathReportMgmtRecordV13[] = [
  { discussed: 95, deathTotal: 100, timely: 98, reportTotal: 100, qualified: 99, registrationTotal: 100 },
  { discussed: 95, deathTotal: 100, timely: 98, reportTotal: 100, qualified: 99, registrationTotal: 100 },
];

describe("computeDeathCaseDiscussionRateV13", () => {
  // 算式：(95+95)/(100+100)×100 = 190/200×100 = 95.00
  it("死亡病例讨论率 = 95.00%", () => {
    expect(computeDeathCaseDiscussionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeDeathCaseDiscussionRateV13([])).toBe(0);
  });
});

describe("computeDeathReportTimelyRateV13", () => {
  // 算式：(98+98)/(100+100)×100 = 196/200×100 = 98.00
  it("死亡报告及时率 = 98.00%", () => {
    expect(computeDeathReportTimelyRateV13(records)).toBe(98.00);
  });
});

describe("computeDeathCauseRegistrationPassRateV13", () => {
  // 算式：(99+99)/(100+100)×100 = 198/200×100 = 99.00
  it("死亡原因登记合格率 = 99.00%", () => {
    expect(computeDeathCauseRegistrationPassRateV13(records)).toBe(99.00);
  });
});

describe("deathReportMgmtV13Routes 读路由", () => {
  it("GET /api/v1/death-report-mgmt 路由存在且 auth:true", () => {
    const route = deathReportMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/death-report-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
