/**
 * 健澜科技 jlmedaios - 输血管理 V13 单测（M392-D，M392 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePreTransfusionTestCompletionRateV13,
  computeTransfusionAdverseReactionRateV13,
  computeTransfusionApplicationRateV13,
  type BloodMgmtDetailRecordV13,
} from "../../src/bff/aggregators/bloodMgmtDetailV13Aggregator";
import { bloodMgmtDetailV13Routes } from "../../src/bff/routes/bloodMgmtDetailV13";

const records: BloodMgmtDetailRecordV13[] = [
  { applicationCount: 50, patientTotalCount: 1000, adverseCount: 2, transfusionCount: 1000, completedCount: 980, shouldCount: 1000 },
  { applicationCount: 50, patientTotalCount: 1000, adverseCount: 2, transfusionCount: 1000, completedCount: 980, shouldCount: 1000 },
];

describe("computeTransfusionApplicationRateV13", () => {
  // 算式：(50+50)/(1000+1000) = 100/2000×100 = 5.00
  it("输血申请率 = 5.00%", () => {
    expect(computeTransfusionApplicationRateV13(records)).toBe(5.00);
  });
  it("空态 → 0", () => {
    expect(computeTransfusionApplicationRateV13([])).toBe(0);
  });
});

describe("computeTransfusionAdverseReactionRateV13", () => {
  // 算式：(2+2)/(1000+1000)×100 = 4/2000×100 = 0.20
  it("输血不良反应率 = 0.20%", () => {
    expect(computeTransfusionAdverseReactionRateV13(records)).toBe(0.20);
  });
});

describe("computePreTransfusionTestCompletionRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("输血前检验完成率 = 98.00%", () => {
    expect(computePreTransfusionTestCompletionRateV13(records)).toBe(98.00);
  });
});

describe("bloodMgmtDetailV13Routes 读路由", () => {
  it("GET /api/v1/blood-mgmt-detail 路由存在且 auth:true", () => {
    const route = bloodMgmtDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/blood-mgmt-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
