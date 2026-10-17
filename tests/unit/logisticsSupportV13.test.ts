/**
 * 健澜科技 jlmedaios - 后勤保障 V13 单测（M385-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBeddingWashCountV13,
  computeCateringSupplyCountV13,
  computePropertyInspectionCountV13,
  type LogisticsSupportRecordV13,
} from "../../src/bff/aggregators/logisticsSupportV13Aggregator";
import { logisticsSupportV13Routes } from "../../src/bff/routes/logisticsSupportV13";

const records: LogisticsSupportRecordV13[] = [
  { beddingWashCount: 1000, cateringSupplyCount: 5000, propertyInspectionCount: 100 },
  { beddingWashCount: 1000, cateringSupplyCount: 5000, propertyInspectionCount: 100 },
];

describe("computeBeddingWashCountV13", () => {
  // 算式：1000+1000 = 2000
  it("被服洗涤量 = 2000 件", () => {
    expect(computeBeddingWashCountV13(records)).toBe(2000);
  });
  it("空态 → 0", () => {
    expect(computeBeddingWashCountV13([])).toBe(0);
  });
});

describe("computeCateringSupplyCountV13", () => {
  // 算式：5000+5000 = 10000
  it("餐饮供应人次 = 10000 人次", () => {
    expect(computeCateringSupplyCountV13(records)).toBe(10000);
  });
});

describe("computePropertyInspectionCountV13", () => {
  // 算式：100+100 = 200
  it("物业巡检次数 = 200 次", () => {
    expect(computePropertyInspectionCountV13(records)).toBe(200);
  });
});

describe("logisticsSupportV13Routes 读路由", () => {
  it("GET /api/v1/logistics-support 路由存在且 auth:true", () => {
    const route = logisticsSupportV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/logistics-support",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
