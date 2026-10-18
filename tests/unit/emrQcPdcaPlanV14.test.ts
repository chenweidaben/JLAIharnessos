/**
 * 健澜科技 jlmedaios - 质控 PDCA 改进计划 V14 单测（M504-A）
 *
 * 测试 buildPdcaPlan 构建、advancePdcaPhase 阶段推进、buildPdcaReport 报告构建、POST 路由 auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  advancePdcaPhase,
  buildPdcaPlan,
  buildPdcaReport,
  type PdcaPlanV14,
} from "../../src/bff/aggregators/emrQcPdcaPlanV14Aggregator";
import { emrQcPdcaPlanV14Routes } from "../../src/bff/routes/emrQcPdcaPlanV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildPdcaPlan 降低缺陷率", () => {
  // 手算：title='降低病历缺陷率', currentPhase='P' → 正确构建
  it("title='降低病历缺陷率', currentPhase='P' → 正确构建", () => {
    const plan: PdcaPlanV14 = buildPdcaPlan("降低病历缺陷率", "P");
    expect(plan.title).toBe("降低病历缺陷率");
    expect(plan.currentPhase).toBe("P");
  });
});

describe("advancePdcaPhase P到D", () => {
  // 手算：current='P' → 'D'（P→D）
  it("current='P' → 'D'", () => {
    const next = advancePdcaPhase("P");
    expect(next).toBe("D");
  });
});

describe("advancePdcaPhase A到完成", () => {
  // 手算：current='A' → '完成'（A→完成）
  it("current='A' → '完成'", () => {
    const next = advancePdcaPhase("A");
    expect(next).toBe("完成");
  });
});

describe("buildPdcaReport D阶段", () => {
  // 手算：{title:'降低缺陷率', currentPhase:'D'} → 正确构建（下一阶段=C）
  it("{title:'降低缺陷率', currentPhase:'D'} → 正确构建", () => {
    const plan: PdcaPlanV14 = buildPdcaPlan("降低缺陷率", "D");
    const report = buildPdcaReport(plan);
    expect(report.title).toBe("降低缺陷率");
    expect(report.currentPhase).toBe("D");
    expect(report.nextPhase).toBe("C");
    expect(report.isComplete).toBe(false);
  });
});

describe("POST 路由", () => {
  it("POST /api/v1/emr-qc-pdca-plan auth:true", () => {
    const def = (emrQcPdcaPlanV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-pdca-plan");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
