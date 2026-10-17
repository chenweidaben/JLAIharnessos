/**
 * 健澜科技 jlmedaios - 平均住院日 V13 单测（M334-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeALOSVarianceV13,
  computeDeptALOSV13,
  computeOverallALOSV13,
  type ALOSRecordV13,
} from "../../src/bff/aggregators/averageLengthOfStayV13Aggregator";
import { averageLengthOfStayV13Routes } from "../../src/bff/routes/averageLengthOfStayV13";

const records: ALOSRecordV13[] = [
  { department: "心内科", inpatientDays: 5, caseCount: 1 },
  { department: "骨科", inpatientDays: 7, caseCount: 1 },
  { department: "神经内科", inpatientDays: 6, caseCount: 1 },
];

describe("computeOverallALOSV13", () => {
  // 算式：(5+7+6)/(1+1+1) = 18/3 = 6.0
  it("全院均日 = 6.0", () => {
    expect(computeOverallALOSV13(records)).toBe(6.0);
  });
  it("空态 → 0", () => {
    expect(computeOverallALOSV13([])).toBe(0);
  });
});

describe("computeDeptALOSV13", () => {
  // 算式：心内科 5/1=5.0 / 骨科 7/1=7.0 / 神内 6/1=6.0
  it("心内科 = 5.0 天", () => {
    const depts = computeDeptALOSV13(records);
    expect(depts.length).toBe(3);
    expect(depts[0].department).toBe("心内科");
    expect(depts[0].alos).toBe(5.0);
  });
});

describe("computeALOSVarianceV13", () => {
  // 算式：6.0 - 6.5 = -0.5
  it("与基准差值 = -0.5 天", () => {
    expect(computeALOSVarianceV13(6.0, 6.5)).toBe(-0.5);
  });
});

describe("averageLengthOfStayV13Routes 读路由", () => {
  it("GET /api/v1/average-length-of-stay 路由存在且 auth:true", () => {
    const route = averageLengthOfStayV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/average-length-of-stay",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
