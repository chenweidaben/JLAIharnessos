/**
 * 健澜科技 jlmedaios - 便民服务 V13 单测（M378-D，M378 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeConvenienceCabinetUsageCountV13,
  computeReportPrintCountV13,
  computeSelfServiceMachineUsageCountV13,
  type ConvenienceServiceRecordV13,
} from "../../src/bff/aggregators/convenienceServiceV13Aggregator";
import { convenienceServiceV13Routes } from "../../src/bff/routes/convenienceServiceV13";

const records: ConvenienceServiceRecordV13[] = [
  { selfServiceMachineCount: 500, reportPrintCount: 300, convenienceCabinetCount: 200 },
  { selfServiceMachineCount: 500, reportPrintCount: 300, convenienceCabinetCount: 200 },
];

describe("computeSelfServiceMachineUsageCountV13", () => {
  // 算式：500+500 = 1000
  it("自助机使用人次 = 1000", () => {
    expect(computeSelfServiceMachineUsageCountV13(records)).toBe(1000);
  });
  it("空态 → 0", () => {
    expect(computeSelfServiceMachineUsageCountV13([])).toBe(0);
  });
});

describe("computeReportPrintCountV13", () => {
  // 算式：300+300 = 600
  it("报告打印人次 = 600", () => {
    expect(computeReportPrintCountV13(records)).toBe(600);
  });
});

describe("computeConvenienceCabinetUsageCountV13", () => {
  // 算式：200+200 = 400
  it("便民柜使用人次 = 400", () => {
    expect(computeConvenienceCabinetUsageCountV13(records)).toBe(400);
  });
});

describe("convenienceServiceV13Routes 读路由", () => {
  it("GET /api/v1/convenience-service 路由存在且 auth:true", () => {
    const route = convenienceServiceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/convenience-service",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
