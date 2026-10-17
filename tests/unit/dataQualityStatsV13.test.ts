/**
 * 健澜科技 jlmedaios - 数据质量 V13 单测（M353-B，stats 避让已有 dataQualityV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAccuracyRateV13,
  computeIntegrityRateV13,
  computeMasterDataConsistencyRateV13,
  type DataQualityStatsRecordV13,
} from "../../src/bff/aggregators/dataQualityStatsV13Aggregator";
import { dataQualityStatsV13Routes } from "../../src/bff/routes/dataQualityStatsV13";

const records: DataQualityStatsRecordV13[] = [
  { integrityPassedCount: 98, integrityCheckedCount: 100, accuracyPassedCount: 99, accuracyCheckedCount: 100, masterConsistentCount: 99, masterComparedCount: 100 },
  { integrityPassedCount: 97, integrityCheckedCount: 100, accuracyPassedCount: 98, accuracyCheckedCount: 100, masterConsistentCount: 99, masterComparedCount: 100 },
];

describe("computeIntegrityRateV13", () => {
  // 算式：(98+97)/(100+100) = 195/200×100 = 97.50
  it("数据完整性合格率 = 97.50%", () => {
    expect(computeIntegrityRateV13(records)).toBe(97.50);
  });
  it("空态 → 0", () => {
    expect(computeIntegrityRateV13([])).toBe(0);
  });
});

describe("computeAccuracyRateV13", () => {
  // 算式：(99+98)/(100+100) = 197/200×100 = 98.50
  it("数据准确性合格率 = 98.50%", () => {
    expect(computeAccuracyRateV13(records)).toBe(98.50);
  });
});

describe("computeMasterDataConsistencyRateV13", () => {
  // 算式：(99+99)/(100+100) = 198/200×100 = 99.00
  it("主数据一致性合格率 = 99.00%", () => {
    expect(computeMasterDataConsistencyRateV13(records)).toBe(99.00);
  });
});

describe("dataQualityStatsV13Routes 读路由", () => {
  it("GET /api/v1/data-quality-stats 路由存在且 auth:true", () => {
    const route = dataQualityStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/data-quality-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
