/**
 * 健澜科技 jlmedaios - 检查服务 V13 单测（M374-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCtExaminationCountV13,
  computeMriExaminationCountV13,
  computeUltrasoundExaminationCountV13,
  type ExaminationServiceRecordV13,
} from "../../src/bff/aggregators/examinationServiceV13Aggregator";
import { examinationServiceV13Routes } from "../../src/bff/routes/examinationServiceV13";

const records: ExaminationServiceRecordV13[] = [
  { ctCount: 100, mriCount: 50, ultrasoundCount: 300 },
  { ctCount: 100, mriCount: 50, ultrasoundCount: 300 },
];

describe("computeCtExaminationCountV13", () => {
  // 算式：100+100 = 200
  it("CT 检查人次 = 200", () => {
    expect(computeCtExaminationCountV13(records)).toBe(200);
  });
  it("空态 → 0", () => {
    expect(computeCtExaminationCountV13([])).toBe(0);
  });
});

describe("computeMriExaminationCountV13", () => {
  // 算式：50+50 = 100
  it("MRI 检查人次 = 100", () => {
    expect(computeMriExaminationCountV13(records)).toBe(100);
  });
});

describe("computeUltrasoundExaminationCountV13", () => {
  // 算式：300+300 = 600
  it("超声检查人次 = 600", () => {
    expect(computeUltrasoundExaminationCountV13(records)).toBe(600);
  });
});

describe("examinationServiceV13Routes 读路由", () => {
  it("GET /api/v1/examination-service 路由存在且 auth:true", () => {
    const route = examinationServiceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/examination-service",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
