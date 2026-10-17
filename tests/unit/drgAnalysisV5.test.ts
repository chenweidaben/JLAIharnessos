/**
 * 健澜科技 jlmedaios - 病种/DRG 经营分析 V5 单测（M287-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDrgProfitV5,
  detectLossDrgV5,
  rankDrgV5,
  type DrgCase,
} from "../../src/bff/aggregators/drgAnalysisV5Aggregator";
import { drgAnalysisV5Routes } from "../../src/bff/routes/drgAnalysisV5";

const ah1: DrgCase = { drgCode: "AH1", drgName: "冠脉支架", caseCnt: 200, avgCost: 3.2, avgReimburse: 3.8, cmi: 2.5, los: 6 };
const bj1: DrgCase = { drgCode: "BJ1", drgName: "髋置换", caseCnt: 150, avgCost: 5.0, avgReimburse: 4.8, cmi: 3.0, los: 10 };

describe("buildDrgProfitV5", () => {
  it("AH1: 均次利润=0.6，总利润=120万", () => {
    // 3.8-3.2=0.6; 0.6*200=120
    const p = buildDrgProfitV5(ah1);
    expect(p.avgProfit).toBe(0.6);
    expect(p.totalProfit).toBe(120);
    expect(p.isLoss).toBe(false);
  });
  it("BJ1: 均次利润=-0.2，isLoss=true", () => {
    expect(buildDrgProfitV5(bj1).isLoss).toBe(true);
  });
});

describe("rankDrgV5", () => {
  it("AH1总利润120 > BJ1总利润-30 → AH1第1", () => {
    const r = rankDrgV5([bj1, ah1]);
    expect(r[0].drgCode).toBe("AH1");
    expect(r[0].rank).toBe(1);
  });
});

describe("detectLossDrgV5", () => {
  it("BJ1亏损→预警", () => {
    expect(detectLossDrgV5([ah1, bj1]).map((d) => d.drgCode)).toEqual(["BJ1"]);
  });
});

describe("drgAnalysisV5Routes 写权限", () => {
  it("POST /api/v1/drg-analysis/snapshot 路由存在且 auth:true", () => {
    const post = drgAnalysisV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/drg-analysis/snapshot");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
