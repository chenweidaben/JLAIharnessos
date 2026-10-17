/**
 * 健澜科技 jlmedaios - 医疗废物 V13 单测（M351-D，M351 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHandoverRegisterRateV13,
  computeSortCollectionRateV13,
  computeStorageTimeoutRateV13,
  type MedicalWasteRecordV13,
} from "../../src/bff/aggregators/medicalWasteV13Aggregator";
import { medicalWasteV13Routes } from "../../src/bff/routes/medicalWasteV13";

const records: MedicalWasteRecordV13[] = [
  { sortedCount: 98, totalCount: 100, registeredCount: 100, handedOverCount: 100, timeoutCount: 2, storedCount: 100 },
  { sortedCount: 98, totalCount: 100, registeredCount: 100, handedOverCount: 100, timeoutCount: 3, storedCount: 100 },
];

describe("computeSortCollectionRateV13", () => {
  // 算式：(98+98)/(100+100) = 196/200×100 = 98.00
  it("分类收集率 = 98.00%", () => {
    expect(computeSortCollectionRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeSortCollectionRateV13([])).toBe(0);
  });
});

describe("computeHandoverRegisterRateV13", () => {
  // 算式：(100+100)/(100+100) = 200/200×100 = 100.00
  it("交接登记率 = 100.00%", () => {
    expect(computeHandoverRegisterRateV13(records)).toBe(100.00);
  });
});

describe("computeStorageTimeoutRateV13", () => {
  // 算式：(2+3)/(100+100) = 5/200×100 = 2.50
  it("暂存超时率 = 2.50%", () => {
    expect(computeStorageTimeoutRateV13(records)).toBe(2.50);
  });
});

describe("medicalWasteV13Routes 读路由", () => {
  it("GET /api/v1/medical-waste 路由存在且 auth:true", () => {
    const route = medicalWasteV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-waste",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
