/**
 * 健澜科技 jlmedaios - 护理文书管理 V13 单测（M358-D，M358 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeNursingDocumentPassRateV13,
  computeNursingRecordTimelyRateV13,
  computeOrderExecutionAccuracyRateV13,
  type NursingDocumentRecordV13,
} from "../../src/bff/aggregators/nursingDocumentV13Aggregator";
import { nursingDocumentV13Routes } from "../../src/bff/routes/nursingDocumentV13";

const records: NursingDocumentRecordV13[] = [
  { documentPassed: 95, documentSampled: 100, recordTimely: 480, recordCount: 500, orderAccurate: 990, orderExecuted: 1000 },
  { documentPassed: 95, documentSampled: 100, recordTimely: 470, recordCount: 500, orderAccurate: 995, orderExecuted: 1000 },
];

describe("computeNursingDocumentPassRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("护理文书合格率 = 95.00%", () => {
    expect(computeNursingDocumentPassRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeNursingDocumentPassRateV13([])).toBe(0);
  });
});

describe("computeNursingRecordTimelyRateV13", () => {
  // 算式：(480+470)/(500+500) = 950/1000×100 = 95.00
  it("护理记录及时率 = 95.00%", () => {
    expect(computeNursingRecordTimelyRateV13(records)).toBe(95.00);
  });
});

describe("computeOrderExecutionAccuracyRateV13", () => {
  // 算式：(990+995)/(1000+1000) = 1985/2000×100 = 99.25
  it("医嘱执行准确率 = 99.25%", () => {
    expect(computeOrderExecutionAccuracyRateV13(records)).toBe(99.25);
  });
});

describe("nursingDocumentV13Routes 读路由", () => {
  it("GET /api/v1/nursing-document 路由存在且 auth:true", () => {
    const route = nursingDocumentV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-document",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
