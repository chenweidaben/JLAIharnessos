/**
 * 健澜科技 jlmedaios - 病理管理 V13 单测（M415-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFrozenVsParaffinMatchRateV13,
  computePathologyDiagnosisMatchRateV13,
  computeRoutinePathologyReportTimelyRateV13,
  type PathologyMgmtRecordV13,
} from "../../src/bff/aggregators/pathologyMgmtV13Aggregator";
import { pathologyMgmtV13Routes } from "../../src/bff/routes/pathologyMgmtV13";

const records: PathologyMgmtRecordV13[] = [
  { timely: 950, reportTotal: 1000, match: 980, diagnosisTotal: 1000, frozenParaffinMatch: 900, frozenTotal: 1000 },
  { timely: 950, reportTotal: 1000, match: 980, diagnosisTotal: 1000, frozenParaffinMatch: 900, frozenTotal: 1000 },
];

describe("computeRoutinePathologyReportTimelyRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("常规病理报告及时率 = 95.00%", () => {
    expect(computeRoutinePathologyReportTimelyRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeRoutinePathologyReportTimelyRateV13([])).toBe(0);
  });
});

describe("computePathologyDiagnosisMatchRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("病理诊断符合率 = 98.00%", () => {
    expect(computePathologyDiagnosisMatchRateV13(records)).toBe(98.00);
  });
});

describe("computeFrozenVsParaffinMatchRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("冰冻病理与石蜡诊断符合率 = 90.00%", () => {
    expect(computeFrozenVsParaffinMatchRateV13(records)).toBe(90.00);
  });
});

describe("pathologyMgmtV13Routes 读路由", () => {
  it("GET /api/v1/pathology-mgmt 路由存在且 auth:true", () => {
    const route = pathologyMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/pathology-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
