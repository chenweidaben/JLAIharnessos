/**
 * 健澜科技 jlmedaios - 投诉率 V13 单测（M347-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDischargedPatientComplaintRateV13,
  computePerThousandInpatientDaysComplaintsV13,
  type ComplaintRecordV13,
} from "../../src/bff/aggregators/complaintRateV13Aggregator";
import { complaintRateV13Routes } from "../../src/bff/routes/complaintRateV13";

const records: ComplaintRecordV13[] = [
  { complaintCount: 1, dischargedCount: 500, inpatientDays: 1500 },
  { complaintCount: 2, dischargedCount: 500, inpatientDays: 1500 },
];

describe("computeDischargedPatientComplaintRateV13", () => {
  // 算式：(1+2)/(500+500)×1000 = 3/1000×1000 = 3.00‰
  it("出院患者投诉率 = 3.00‰", () => {
    expect(computeDischargedPatientComplaintRateV13(records)).toBe(3.00);
  });
  it("空态 → 0", () => {
    expect(computeDischargedPatientComplaintRateV13([])).toBe(0);
  });
  // 边界：出院数=0
  it("出院数为 0 的边界 → 0", () => {
    const boundary: ComplaintRecordV13[] = [
      { complaintCount: 1, dischargedCount: 0, inpatientDays: 1000 },
    ];
    expect(computeDischargedPatientComplaintRateV13(boundary)).toBe(0);
  });
});

describe("computePerThousandInpatientDaysComplaintsV13", () => {
  // 算式：(1+2)/(1500+1500)×1000 = 3/3000×1000 = 1.00
  it("千住院日投诉数 = 1.00", () => {
    expect(computePerThousandInpatientDaysComplaintsV13(records)).toBe(1.00);
  });
});

describe("complaintRateV13Routes 读路由", () => {
  it("GET /api/v1/complaint-rate 路由存在且 auth:true", () => {
    const route = complaintRateV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/complaint-rate",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
