/**
 * 健澜科技 jlmedaios - 护理管理明细 V13 单测（M405-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHeadNurseWardRoundPassRateV13,
  computeNursingAdverseEventReportRateV13,
  computeNursingQCPassRateV13,
  type NursingManagementDetailRecordV13,
} from "../../src/bff/aggregators/nursingManagementDetailV13Aggregator";
import { nursingManagementDetailV13Routes } from "../../src/bff/routes/nursingManagementDetailV13";

const records: NursingManagementDetailRecordV13[] = [
  { headPass: 980, headTotal: 1000, reported: 95, totalAdverse: 100, qcPass: 970, qcTotal: 1000 },
  { headPass: 980, headTotal: 1000, reported: 95, totalAdverse: 100, qcPass: 970, qcTotal: 1000 },
];

describe("computeHeadNurseWardRoundPassRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("护士长查房合格率 = 98.00%", () => {
    expect(computeHeadNurseWardRoundPassRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeHeadNurseWardRoundPassRateV13([])).toBe(0);
  });
});

describe("computeNursingAdverseEventReportRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("护理不良事件上报率 = 95.00%", () => {
    expect(computeNursingAdverseEventReportRateV13(records)).toBe(95.00);
  });
});

describe("computeNursingQCPassRateV13", () => {
  // 算式：(970+970)/(1000+1000) = 1940/2000×100 = 97.00
  it("护理质控合格率 = 97.00%", () => {
    expect(computeNursingQCPassRateV13(records)).toBe(97.00);
  });
});

describe("nursingManagementDetailV13Routes 读路由", () => {
  it("GET /api/v1/nursing-management-detail 路由存在且 auth:true", () => {
    const route = nursingManagementDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-management-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
