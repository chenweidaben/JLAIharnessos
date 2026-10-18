/**
 * 健澜科技 jlmedaios - 手术麻醉管理 V13 单测（M454-C，门急诊与手术麻醉管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeSurgeryAnesthesiaComplicationRateV13,
  computeSurgeryAnesthesiaOnTimeStartRateV13,
  computeSurgeryAnesthesiaPreAssessmentRateV13,
  type SurgeryAnesthesiaMgmtRecordV13,
} from "../../src/bff/aggregators/surgeryAnesthesiaMgmtV13Aggregator";
import { surgeryAnesthesiaMgmtV13Routes } from "../../src/bff/routes/surgeryAnesthesiaMgmtV13";

const records: SurgeryAnesthesiaMgmtRecordV13[] = [
  { onTime: 950, totalSurgery: 1000, assessed: 900, totalAnesthesia: 1000, complication: 30 },
  { onTime: 950, totalSurgery: 1000, assessed: 900, totalAnesthesia: 1000, complication: 30 },
];

describe("computeSurgeryAnesthesiaOnTimeStartRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("手术按时开台率 = 95.00%", () => {
    expect(computeSurgeryAnesthesiaOnTimeStartRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeSurgeryAnesthesiaOnTimeStartRateV13([])).toBe(0);
  });
});

describe("computeSurgeryAnesthesiaPreAssessmentRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("麻醉前评估完成率 = 90.00%", () => {
    expect(computeSurgeryAnesthesiaPreAssessmentRateV13(records)).toBe(90.00);
  });
});

describe("computeSurgeryAnesthesiaComplicationRateV13", () => {
  // 算式：(30+30)/(1000+1000)×100 = 60/2000×100 = 3.00（反向，越低越好）
  it("手术并发症发生率 = 3.00%（反向，越低越好）", () => {
    expect(computeSurgeryAnesthesiaComplicationRateV13(records)).toBe(3.00);
  });
});

describe("surgeryAnesthesiaMgmtV13Routes 读路由", () => {
  it("GET /api/v1/surgery-anesthesia-mgmt 路由存在且 auth:true", () => {
    const route = surgeryAnesthesiaMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/surgery-anesthesia-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
