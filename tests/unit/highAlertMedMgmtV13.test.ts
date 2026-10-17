/**
 * 健澜科技 jlmedaios - 高危药品管理 V13 单测（M424-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHighAlertMedDoubleCheckRateV13,
  computeHighAlertMedLabelRateV13,
  computeHighAlertMedStorageComplianceRateV13,
  type HighAlertMedMgmtRecordV13,
} from "../../src/bff/aggregators/highAlertMedMgmtV13Aggregator";
import { highAlertMedMgmtV13Routes } from "../../src/bff/routes/highAlertMedMgmtV13";

const records: HighAlertMedMgmtRecordV13[] = [
  { labeled: 980, highAlertTotal: 1000, doubleChecked: 990, prescriptionTotal: 1000, compliantPoint: 970, storagePointTotal: 1000 },
  { labeled: 980, highAlertTotal: 1000, doubleChecked: 990, prescriptionTotal: 1000, compliantPoint: 970, storagePointTotal: 1000 },
];

describe("computeHighAlertMedLabelRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("高危药品标识率 = 98.00%", () => {
    expect(computeHighAlertMedLabelRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeHighAlertMedLabelRateV13([])).toBe(0);
  });
});

describe("computeHighAlertMedDoubleCheckRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("高危药品双人核对率 = 99.00%", () => {
    expect(computeHighAlertMedDoubleCheckRateV13(records)).toBe(99.00);
  });
});

describe("computeHighAlertMedStorageComplianceRateV13", () => {
  // 算式：(970+970)/(1000+1000)×100 = 1940/2000×100 = 97.00
  it("高危药品存放合规率 = 97.00%", () => {
    expect(computeHighAlertMedStorageComplianceRateV13(records)).toBe(97.00);
  });
});

describe("highAlertMedMgmtV13Routes 读路由", () => {
  it("GET /api/v1/high-alert-med-mgmt 路由存在且 auth:true", () => {
    const route = highAlertMedMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/high-alert-med-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
