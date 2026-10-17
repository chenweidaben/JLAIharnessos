/**
 * 健澜科技 jlmedaios - 病案质量 V13 单测（M334-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDefectRateV13,
  computeGradeARateV13,
  computeGradeCRateV13,
  type MRQRecordV13,
} from "../../src/bff/aggregators/mrqQualityV13Aggregator";
import { mrqQualityV13Routes } from "../../src/bff/routes/mrqQualityV13";

const records: MRQRecordV13[] = [
  { totalRecords: 100, gradeACount: 95, gradeCCount: 2, defectCount: 5 },
];

describe("computeGradeARateV13", () => {
  // 算式：95/100×100 = 95
  it("甲级率 = 95%", () => {
    expect(computeGradeARateV13(records)).toBe(95);
  });
  it("空态 → 0", () => {
    expect(computeGradeARateV13([])).toBe(0);
  });
});

describe("computeGradeCRateV13", () => {
  // 算式：2/100×100 = 2
  it("丙级率 = 2%", () => {
    expect(computeGradeCRateV13(records)).toBe(2);
  });
});

describe("computeDefectRateV13", () => {
  // 算式：5/100×100 = 5
  it("缺陷率 = 5%", () => {
    expect(computeDefectRateV13(records)).toBe(5);
  });
});

describe("mrqQualityV13Routes 读路由", () => {
  it("GET /api/v1/mrq-quality 路由存在且 auth:true", () => {
    const route = mrqQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/mrq-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
