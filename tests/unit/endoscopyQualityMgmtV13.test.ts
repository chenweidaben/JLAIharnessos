/**
 * 健澜科技 jlmedaios - 内镜质量管理 V13 单测（M429-B，-quality 后缀避让旧版 endoscopyMgmtV13（M417））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEndoscopyCleanDisinfectionPassRateV13,
  computeEndoscopyComplicationRateV13,
  computeEndoscopyMissRateV13,
  type EndoscopyQualityMgmtRecordV13,
} from "../../src/bff/aggregators/endoscopyQualityMgmtV13Aggregator";
import { endoscopyQualityMgmtV13Routes } from "../../src/bff/routes/endoscopyQualityMgmtV13";

const records: EndoscopyQualityMgmtRecordV13[] = [
  { cleanPass: 980, endoTotal: 1000, complication: 10, miss: 5, endoProcedureTotal: 10000 },
  { cleanPass: 980, endoTotal: 1000, complication: 10, miss: 5, endoProcedureTotal: 10000 },
];

describe("computeEndoscopyCleanDisinfectionPassRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("内镜清洗消毒合格率 = 98.00%", () => {
    expect(computeEndoscopyCleanDisinfectionPassRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeEndoscopyCleanDisinfectionPassRateV13([])).toBe(0);
  });
});

describe("computeEndoscopyComplicationRateV13", () => {
  // 算式：(10+10)/(10000+10000)×100 = 20/20000×100 = 0.10%（反向指标）
  it("内镜诊疗并发症率 = 0.10%（反向指标）", () => {
    expect(computeEndoscopyComplicationRateV13(records)).toBe(0.10);
  });
});

describe("computeEndoscopyMissRateV13", () => {
  // 算式：(5+5)/(10000+10000)×100 = 10/20000×100 = 0.05%（反向指标）
  it("内镜漏诊率 = 0.05%（反向指标）", () => {
    expect(computeEndoscopyMissRateV13(records)).toBe(0.05);
  });
});

describe("endoscopyQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/endoscopy-quality-mgmt 路由存在且 auth:true", () => {
    const route = endoscopyQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/endoscopy-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
