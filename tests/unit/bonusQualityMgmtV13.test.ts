/**
 * 健澜科技 jlmedaios - 奖金分配质量管理 V13 单测（M433-C，-quality 后缀避让旧版 bonusMgmtV13（M410））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBonusAccountingAccuracyRateV13,
  computeBonusAppealResolutionRateV13,
  computeBonusPaymentTimelinessRateV13,
  type BonusQualityMgmtRecordV13,
} from "../../src/bff/aggregators/bonusQualityMgmtV13Aggregator";
import { bonusQualityMgmtV13Routes } from "../../src/bff/routes/bonusQualityMgmtV13";

const records: BonusQualityMgmtRecordV13[] = [
  { accurateCount: 990, totalCount: 1000, timelyPayment: 950, shouldPayment: 1000, resolvedAppeals: 980, acceptedAppeals: 1000 },
  { accurateCount: 990, totalCount: 1000, timelyPayment: 950, shouldPayment: 1000, resolvedAppeals: 980, acceptedAppeals: 1000 },
];

describe("computeBonusAccountingAccuracyRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("奖金核算准确率 = 99.00%", () => {
    expect(computeBonusAccountingAccuracyRateV13(records)).toBe(99.00);
  });
  it("空态 → 0", () => {
    expect(computeBonusAccountingAccuracyRateV13([])).toBe(0);
  });
});

describe("computeBonusPaymentTimelinessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("奖金发放及时率 = 95.00%", () => {
    expect(computeBonusPaymentTimelinessRateV13(records)).toBe(95.00);
  });
});

describe("computeBonusAppealResolutionRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("奖金申诉处理率 = 98.00%", () => {
    expect(computeBonusAppealResolutionRateV13(records)).toBe(98.00);
  });
});

describe("bonusQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/bonus-quality-mgmt 路由存在且 auth:true", () => {
    const route = bonusQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/bonus-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
