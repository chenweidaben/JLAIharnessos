/**
 * 健澜科技 jlmedaios - 新生儿护理管理 V13 单测（M428-A，换名避让旧版 neonatalMgmtV13（M412，-care 后缀））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeNeonatalAsphyxiaOccurrenceRateV13,
  computeNeonatalJaundiceMonitoringRateV13,
  computeNeonatalMortalityRateV13,
  type NeonatalCareMgmtRecordV13,
} from "../../src/bff/aggregators/neonatalCareMgmtV13Aggregator";
import { neonatalCareMgmtV13Routes } from "../../src/bff/routes/neonatalCareMgmtV13";

const records: NeonatalCareMgmtRecordV13[] = [
  { neonatalDeath: 5, liveBirth: 10000, asphyxia: 20, jaundiceMonitored: 950, neonatalTotal: 1000 },
  { neonatalDeath: 5, liveBirth: 10000, asphyxia: 20, jaundiceMonitored: 950, neonatalTotal: 1000 },
];

describe("computeNeonatalMortalityRateV13", () => {
  // 算式：(5+5)/(10000+10000)×1000 = 10/20000×1000 = 0.50‰（千分率，反向指标）
  it("新生儿死亡率 = 0.50‰（反向指标）", () => {
    expect(computeNeonatalMortalityRateV13(records)).toBe(0.50);
  });
  it("空态 → 0", () => {
    expect(computeNeonatalMortalityRateV13([])).toBe(0);
  });
});

describe("computeNeonatalAsphyxiaOccurrenceRateV13", () => {
  // 算式：(20+20)/(10000+10000)×1000 = 40/20000×1000 = 2.00‰（千分率，反向指标）
  it("新生儿窒息发生率 = 2.00‰（反向指标）", () => {
    expect(computeNeonatalAsphyxiaOccurrenceRateV13(records)).toBe(2.00);
  });
});

describe("computeNeonatalJaundiceMonitoringRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00%
  it("新生儿黄疸监测率 = 95.00%", () => {
    expect(computeNeonatalJaundiceMonitoringRateV13(records)).toBe(95.00);
  });
});

describe("neonatalCareMgmtV13Routes 读路由", () => {
  it("GET /api/v1/neonatal-care-mgmt 路由存在且 auth:true", () => {
    const route = neonatalCareMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/neonatal-care-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
