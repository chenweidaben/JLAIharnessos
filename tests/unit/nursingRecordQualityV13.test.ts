/**
 * 健澜科技 jlmedaios - 护理文书质量 V13 单测（M405-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeNursingRecordPassRateV13,
  computeOrderExecutionSheetPassRateV13,
  computeTemperatureChartPassRateV13,
  type NursingRecordQualityRecordV13,
} from "../../src/bff/aggregators/nursingRecordQualityV13Aggregator";
import { nursingRecordQualityV13Routes } from "../../src/bff/routes/nursingRecordQualityV13";

const records: NursingRecordQualityRecordV13[] = [
  { recordPass: 980, recordTotal: 1000, tempPass: 990, tempTotal: 1000, orderPass: 970, orderTotal: 1000 },
  { recordPass: 980, recordTotal: 1000, tempPass: 990, tempTotal: 1000, orderPass: 970, orderTotal: 1000 },
];

describe("computeNursingRecordPassRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("护理记录合格率 = 98.00%", () => {
    expect(computeNursingRecordPassRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeNursingRecordPassRateV13([])).toBe(0);
  });
});

describe("computeTemperatureChartPassRateV13", () => {
  // 算式：(990+990)/(1000+1000) = 1980/2000×100 = 99.00
  it("体温单合格率 = 99.00%", () => {
    expect(computeTemperatureChartPassRateV13(records)).toBe(99.00);
  });
});

describe("computeOrderExecutionSheetPassRateV13", () => {
  // 算式：(970+970)/(1000+1000) = 1940/2000×100 = 97.00
  it("医嘱执行单合格率 = 97.00%", () => {
    expect(computeOrderExecutionSheetPassRateV13(records)).toBe(97.00);
  });
});

describe("nursingRecordQualityV13Routes 读路由", () => {
  it("GET /api/v1/nursing-record-quality 路由存在且 auth:true", () => {
    const route = nursingRecordQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-record-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
