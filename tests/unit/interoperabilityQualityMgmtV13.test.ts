/**
 * 健澜科技 jlmedaios - 互联互通质量管理 V13 单测（M432-D，M432 收官，-quality 后缀避让旧版 interoperabilityMgmtV13（M409））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInteroperabilityApiSuccessRateV13,
  computeInteroperabilityDataShareTimelinessRateV13,
  computeInteroperabilityTestPassRateV13,
  type InteroperabilityQualityMgmtRecordV13,
} from "../../src/bff/aggregators/interoperabilityQualityMgmtV13Aggregator";
import { interoperabilityQualityMgmtV13Routes } from "../../src/bff/routes/interoperabilityQualityMgmtV13";

const records: InteroperabilityQualityMgmtRecordV13[] = [
  { testPass: 980, testTotal: 1000, apiSuccess: 9900, apiTotal: 10000, timelyShare: 950, shouldShare: 1000 },
  { testPass: 980, testTotal: 1000, apiSuccess: 9900, apiTotal: 10000, timelyShare: 950, shouldShare: 1000 },
];

describe("computeInteroperabilityTestPassRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("互联互通测试通过率 = 98.00%", () => {
    expect(computeInteroperabilityTestPassRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeInteroperabilityTestPassRateV13([])).toBe(0);
  });
});

describe("computeInteroperabilityApiSuccessRateV13", () => {
  // 算式：(9900+9900)/(10000+10000)×100 = 19800/20000×100 = 99.00
  it("接口调用成功率 = 99.00%", () => {
    expect(computeInteroperabilityApiSuccessRateV13(records)).toBe(99.00);
  });
});

describe("computeInteroperabilityDataShareTimelinessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("数据共享及时率 = 95.00%", () => {
    expect(computeInteroperabilityDataShareTimelinessRateV13(records)).toBe(95.00);
  });
});

describe("interoperabilityQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/interoperability-quality-mgmt 路由存在且 auth:true", () => {
    const route = interoperabilityQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/interoperability-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
