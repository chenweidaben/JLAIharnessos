/**
 * 健澜科技 jlmedaios - 药品目录 V13 单测（M406-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBasicDrugCatalogRatioV13,
  computeCentralizedProcurementDrugEquipRateV13,
  computeKeyMonitoredDrugRatioV13,
  type PharmacyDrugCatalogRecordV13,
} from "../../src/bff/aggregators/pharmacyDrugCatalogV13Aggregator";
import { pharmacyDrugCatalogV13Routes } from "../../src/bff/routes/pharmacyDrugCatalogV13";

const records: PharmacyDrugCatalogRecordV13[] = [
  { basicDrug: 300, totalCatalog: 1000, equipped: 95, shouldEquip: 100, monitored: 20 },
  { basicDrug: 300, totalCatalog: 1000, equipped: 95, shouldEquip: 100, monitored: 20 },
];

describe("computeBasicDrugCatalogRatioV13", () => {
  // 算式：(300+300)/(1000+1000) = 600/2000×100 = 30.00
  it("基本药物目录占比 = 30.00%", () => {
    expect(computeBasicDrugCatalogRatioV13(records)).toBe(30.00);
  });
  it("空态 → 0", () => {
    expect(computeBasicDrugCatalogRatioV13([])).toBe(0);
  });
});

describe("computeCentralizedProcurementDrugEquipRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("集采药品配备率 = 95.00%", () => {
    expect(computeCentralizedProcurementDrugEquipRateV13(records)).toBe(95.00);
  });
});

describe("computeKeyMonitoredDrugRatioV13", () => {
  // 算式：(20+20)/(1000+1000) = 40/2000×100 = 2.00
  it("重点监控药品占比 = 2.00%", () => {
    expect(computeKeyMonitoredDrugRatioV13(records)).toBe(2.00);
  });
});

describe("pharmacyDrugCatalogV13Routes 读路由", () => {
  it("GET /api/v1/pharmacy-drug-catalog 路由存在且 auth:true", () => {
    const route = pharmacyDrugCatalogV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/pharmacy-drug-catalog",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
