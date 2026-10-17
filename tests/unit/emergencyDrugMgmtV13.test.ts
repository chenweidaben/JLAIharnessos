/**
 * 健澜科技 jlmedaios - 急救药品管理 V13 单测（M388-D，M388 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEmergencyCartDrugCompletenessRateV13,
  computeEmergencyDrugInventoryAccuracyRateV13,
  computeNearExpiryDrugRatioV13,
  type EmergencyDrugMgmtRecordV13,
} from "../../src/bff/aggregators/emergencyDrugMgmtV13Aggregator";
import { emergencyDrugMgmtV13Routes } from "../../src/bff/routes/emergencyDrugMgmtV13";

const records: EmergencyDrugMgmtRecordV13[] = [
  { completeCount: 98, shouldCount: 100, nearExpiryCount: 5, totalCount: 100, matchedCount: 99, inventoryTotalCount: 100 },
  { completeCount: 98, shouldCount: 100, nearExpiryCount: 5, totalCount: 100, matchedCount: 99, inventoryTotalCount: 100 },
];

describe("computeEmergencyCartDrugCompletenessRateV13", () => {
  // 算式：(98+98)/(100+100) = 196/200×100 = 98.00
  it("急救车药品齐备率 = 98.00%", () => {
    expect(computeEmergencyCartDrugCompletenessRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeEmergencyCartDrugCompletenessRateV13([])).toBe(0);
  });
});

describe("computeNearExpiryDrugRatioV13", () => {
  // 算式：(5+5)/(100+100) = 10/200×100 = 5.00
  it("近效期药品占比 = 5.00%", () => {
    expect(computeNearExpiryDrugRatioV13(records)).toBe(5.00);
  });
});

describe("computeEmergencyDrugInventoryAccuracyRateV13", () => {
  // 算式：(99+99)/(100+100) = 198/200×100 = 99.00
  it("急救药品盘点准确率 = 99.00%", () => {
    expect(computeEmergencyDrugInventoryAccuracyRateV13(records)).toBe(99.00);
  });
});

describe("emergencyDrugMgmtV13Routes 读路由", () => {
  it("GET /api/v1/emergency-drug-mgmt 路由存在且 auth:true", () => {
    const route = emergencyDrugMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/emergency-drug-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
