/**
 * 健澜科技 jlmedaios - 患者流明细 V13 单测（M381-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAvgLOSDaysV13,
  computeAvgWaitingHoursV13,
  computeBedTurnoverCountV13,
  type PatientFlowDetailRecordV13,
} from "../../src/bff/aggregators/patientFlowDetailV13Aggregator";
import { patientFlowDetailV13Routes } from "../../src/bff/routes/patientFlowDetailV13";

const records: PatientFlowDetailRecordV13[] = [
  { totalWaitingMinutes: 3000, patientCount: 100, totalLOSDays: 8000, dischargeCount: 1000, avgOpenBedCount: 500 },
  { totalWaitingMinutes: 3000, patientCount: 100, totalLOSDays: 8000, dischargeCount: 1000, avgOpenBedCount: 500 },
];

describe("computeAvgWaitingHoursV13", () => {
  // 算式：(3000+3000)/(100+100) = 6000/200 = 30.00
  it("平均候诊时长 = 30.00 分钟", () => {
    expect(computeAvgWaitingHoursV13(records)).toBe(30.00);
  });
  it("空态 → 0", () => {
    expect(computeAvgWaitingHoursV13([])).toBe(0);
  });
});

describe("computeAvgLOSDaysV13", () => {
  // 算式：(8000+8000)/(1000+1000) = 16000/2000 = 8.00
  it("平均住院日 = 8.00 天", () => {
    expect(computeAvgLOSDaysV13(records)).toBe(8.00);
  });
});

describe("computeBedTurnoverCountV13", () => {
  // 算式：(1000+1000)/(500+500) = 2000/1000 = 2.00
  it("床位周转次数 = 2.00 次", () => {
    expect(computeBedTurnoverCountV13(records)).toBe(2.00);
  });
});

describe("patientFlowDetailV13Routes 读路由", () => {
  it("GET /api/v1/patient-flow-detail 路由存在且 auth:true", () => {
    const route = patientFlowDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/patient-flow-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
