/**
 * 健澜科技 jlmedaios - 分诊管理 V13 单测（M390-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEmergencyTriageAccuracyRateV13,
  computeLevel4AbovePatientRatioV13,
  computeWaitingTimeAvgV13,
  type TriageMgmtRecordV13,
} from "../../src/bff/aggregators/triageMgmtV13Aggregator";
import { triageMgmtV13Routes } from "../../src/bff/routes/triageMgmtV13";

const records: TriageMgmtRecordV13[] = [
  { accurateCount: 950, totalTriageCount: 1000, totalWaitMinutes: 6000, patientCount: 200, level4AboveCount: 100, totalErCount: 1000 },
  { accurateCount: 950, totalTriageCount: 1000, totalWaitMinutes: 6000, patientCount: 200, level4AboveCount: 100, totalErCount: 1000 },
];

describe("computeEmergencyTriageAccuracyRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("急诊分诊准确率 = 95.00%", () => {
    expect(computeEmergencyTriageAccuracyRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeEmergencyTriageAccuracyRateV13([])).toBe(0);
  });
});

describe("computeWaitingTimeAvgV13", () => {
  // 算式：(6000+6000)/(200+200) = 12000/400 = 30.00
  it("平均候诊时长 = 30.00 分钟", () => {
    expect(computeWaitingTimeAvgV13(records)).toBe(30.00);
  });
});

describe("computeLevel4AbovePatientRatioV13", () => {
  // 算式：(100+100)/(1000+1000) = 200/2000×100 = 10.00
  it("四级以上患者占比 = 10.00%", () => {
    expect(computeLevel4AbovePatientRatioV13(records)).toBe(10.00);
  });
});

describe("triageMgmtV13Routes 读路由", () => {
  it("GET /api/v1/triage-mgmt 路由存在且 auth:true", () => {
    const route = triageMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/triage-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
