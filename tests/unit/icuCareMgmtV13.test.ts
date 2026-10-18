/**
 * 健澜科技 jlmedaios - ICU 护理管理 V13 单测（M428-D，M428 收官，换名避让旧版 icuMgmtV13（M416，-care 后缀））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeIcuCatheterRelatedInfectionRateV13,
  computeIcuMortalityRateV13,
  computeIcuPressureUlcerOccurrenceRateV13,
  type IcuCareMgmtRecordV13,
} from "../../src/bff/aggregators/icuCareMgmtV13Aggregator";
import { icuCareMgmtV13Routes } from "../../src/bff/routes/icuCareMgmtV13";

const records: IcuCareMgmtRecordV13[] = [
  { icuDeath: 15, icuDischargeTotal: 100, icuPressureUlcer: 5, icuTotal: 100, catheterInfection: 3, catheterTotal: 100 },
  { icuDeath: 15, icuDischargeTotal: 100, icuPressureUlcer: 5, icuTotal: 100, catheterInfection: 3, catheterTotal: 100 },
];

describe("computeIcuMortalityRateV13", () => {
  // 算式：(15+15)/(100+100)×100 = 30/200×100 = 15.00%（反向指标）
  it("ICU 死亡率 = 15.00%（反向指标）", () => {
    expect(computeIcuMortalityRateV13(records)).toBe(15.00);
  });
  it("空态 → 0", () => {
    expect(computeIcuMortalityRateV13([])).toBe(0);
  });
});

describe("computeIcuPressureUlcerOccurrenceRateV13", () => {
  // 算式：(5+5)/(100+100)×100 = 10/200×100 = 5.00%（反向指标）
  it("ICU 压疮发生率 = 5.00%（反向指标）", () => {
    expect(computeIcuPressureUlcerOccurrenceRateV13(records)).toBe(5.00);
  });
});

describe("computeIcuCatheterRelatedInfectionRateV13", () => {
  // 算式：(3+3)/(100+100)×100 = 6/200×100 = 3.00%（反向指标）
  it("ICU 导管相关感染率 = 3.00%（反向指标）", () => {
    expect(computeIcuCatheterRelatedInfectionRateV13(records)).toBe(3.00);
  });
});

describe("icuCareMgmtV13Routes 读路由", () => {
  it("GET /api/v1/icu-care-mgmt 路由存在且 auth:true", () => {
    const route = icuCareMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/icu-care-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
