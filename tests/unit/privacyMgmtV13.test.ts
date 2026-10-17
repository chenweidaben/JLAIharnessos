/**
 * 健澜科技 jlmedaios - 隐私保护管理 V13 单测（M425-D，M425 收官，换名避让旧版 informationSecurityMgmtV13（M419））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePrivacyLeakEventCountV13,
  computePrivacyPolicyImplementationRateV13,
  computePrivacyTrainingCoverageRateV13,
  type PrivacyMgmtRecordV13,
} from "../../src/bff/aggregators/privacyMgmtV13Aggregator";
import { privacyMgmtV13Routes } from "../../src/bff/routes/privacyMgmtV13";

const records: PrivacyMgmtRecordV13[] = [
  { leakEvents: 3, trained: 950, shouldTrain: 1000, implementedDept: 98, shouldImplementDept: 100 },
  { leakEvents: 2, trained: 950, shouldTrain: 1000, implementedDept: 98, shouldImplementDept: 100 },
];

describe("computePrivacyLeakEventCountV13", () => {
  // 算式：3+2 = 5（整数求和，不是百分比）
  it("患者隐私泄露事件数 = 5 件", () => {
    expect(computePrivacyLeakEventCountV13(records)).toBe(5);
  });
  it("空态 → 0", () => {
    expect(computePrivacyLeakEventCountV13([])).toBe(0);
  });
});

describe("computePrivacyTrainingCoverageRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("隐私保护培训覆盖率 = 95.00%", () => {
    expect(computePrivacyTrainingCoverageRateV13(records)).toBe(95.00);
  });
});

describe("computePrivacyPolicyImplementationRateV13", () => {
  // 算式：(98+98)/(100+100)×100 = 196/200×100 = 98.00
  it("隐私制度落实率 = 98.00%", () => {
    expect(computePrivacyPolicyImplementationRateV13(records)).toBe(98.00);
  });
});

describe("privacyMgmtV13Routes 读路由", () => {
  it("GET /api/v1/privacy-mgmt 路由存在且 auth:true", () => {
    const route = privacyMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/privacy-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
