/**
 * 健澜科技 jlmedaios - 孕产妇护理管理 V13 单测（M428-B，换名避让旧版 maternalMgmtV13（M412，-care 后缀））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCesareanSectionRateV13,
  computeMaternalMortalityRateV13,
  computePostpartumHemorrhageRateV13,
  type MaternalCareMgmtRecordV13,
} from "../../src/bff/aggregators/maternalCareMgmtV13Aggregator";
import { maternalCareMgmtV13Routes } from "../../src/bff/routes/maternalCareMgmtV13";

const records: MaternalCareMgmtRecordV13[] = [
  { maternalDeath: 2, liveBirth: 100000, postpartumHemorrhage: 30, deliveryTotal: 1000, cesarean: 400 },
  { maternalDeath: 2, liveBirth: 100000, postpartumHemorrhage: 30, deliveryTotal: 1000, cesarean: 400 },
];

describe("computeMaternalMortalityRateV13", () => {
  // 算式：(2+2)/(100000+100000)×100000 = 4/200000×100000 = 2.00/10万（反向指标）
  it("孕产妇死亡率 = 2.00/10万（反向指标）", () => {
    expect(computeMaternalMortalityRateV13(records)).toBe(2.00);
  });
  it("空态 → 0", () => {
    expect(computeMaternalMortalityRateV13([])).toBe(0);
  });
});

describe("computePostpartumHemorrhageRateV13", () => {
  // 算式：(30+30)/(1000+1000)×100 = 60/2000×100 = 3.00%（反向指标）
  it("产后出血发生率 = 3.00%（反向指标）", () => {
    expect(computePostpartumHemorrhageRateV13(records)).toBe(3.00);
  });
});

describe("computeCesareanSectionRateV13", () => {
  // 算式：(400+400)/(1000+1000)×100 = 800/2000×100 = 40.00%（控制指标）
  it("剖宫产率 = 40.00%（控制指标）", () => {
    expect(computeCesareanSectionRateV13(records)).toBe(40.00);
  });
});

describe("maternalCareMgmtV13Routes 读路由", () => {
  it("GET /api/v1/maternal-care-mgmt 路由存在且 auth:true", () => {
    const route = maternalCareMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/maternal-care-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
