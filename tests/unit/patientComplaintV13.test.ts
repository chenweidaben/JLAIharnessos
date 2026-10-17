/**
 * 健澜科技 jlmedaios - 患者投诉处理 V13 单测（M326-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  classifyComplaintByTypeV13,
  computeTimelinessRateV13,
  countMonthlyComplaintsV13,
  type ComplaintRecordV13,
} from "../../src/bff/aggregators/patientComplaintV13Aggregator";
import { patientComplaintV13Routes } from "../../src/bff/routes/patientComplaintV13";

const complaints: ComplaintRecordV13[] = [
  { type: "attitude", isTimely: true },
  { type: "attitude", isTimely: true },
  { type: "attitude", isTimely: true },
  { type: "process", isTimely: true },
  { type: "process", isTimely: true },
  { type: "process", isTimely: false },
  { type: "fee", isTimely: true },
  { type: "fee", isTimely: true },
  { type: "quality", isTimely: true },
  { type: "quality", isTimely: false },
];

describe("countMonthlyComplaintsV13", () => {
  // 算式：10 件投诉
  it("投诉总数 = 10", () => {
    expect(countMonthlyComplaintsV13(complaints)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(countMonthlyComplaintsV13([])).toBe(0);
  });
});

describe("computeTimelinessRateV13", () => {
  // 算式：8/10×100 = 80
  it("及时率 = 80%", () => {
    expect(computeTimelinessRateV13(complaints)).toBe(80);
  });
});

describe("classifyComplaintByTypeV13", () => {
  // 算式：attitude=3 / process=3 / fee=2 / quality=2
  it("类型分组 = 4 类", () => {
    const result = classifyComplaintByTypeV13(complaints);
    expect(result.length).toBe(4);
    expect(result.find((d) => d.type === "attitude")?.count).toBe(3);
    expect(result.find((d) => d.type === "process")?.count).toBe(3);
    expect(result.find((d) => d.type === "fee")?.count).toBe(2);
    expect(result.find((d) => d.type === "quality")?.count).toBe(2);
  });
});

describe("patientComplaintV13Routes 读路由", () => {
  it("GET /api/v1/patient-complaint 路由存在且 auth:true", () => {
    const route = patientComplaintV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/patient-complaint",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
