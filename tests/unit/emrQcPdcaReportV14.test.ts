/**
 * 健澜科技 jlmedaios - 质控 PDCA 闭环报告 V14 单测（M496-D，M496 收官）
 *
 * 测试 buildPdcaReport 构建、aggregatePdcaCycle 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPdcaReport,
  aggregatePdcaCycle,
  type PdcaReportV14,
} from "../../src/bff/aggregators/emrQcPdcaReportV14Aggregator";
import { emrQcPdcaReportV14Routes } from "../../src/bff/routes/emrQcPdcaReportV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildPdcaReport 改进书写规范", () => {
  // 手算：plan='改进书写规范', do='培训医生', check='抽查病历', act='修订规则' → 正确构建
  it("plan='改进书写规范', do='培训医生', check='抽查病历', act='修订规则' → 正确构建", () => {
    const report: PdcaReportV14 = buildPdcaReport("改进书写规范", "培训医生", "抽查病历", "修订规则");
    expect(report.plan).toBe("改进书写规范");
    expect(report.do).toBe("培训医生");
    expect(report.check).toBe("抽查病历");
    expect(report.act).toBe("修订规则");
  });
});

describe("aggregatePdcaCycle 4阶段", () => {
  // 手算：4 阶段（3 已完成/1 未完成）→ total=4, completed=3, rate=Math.ceil(3/4×100)=75
  it("4 阶段（3 已完成/1 未完成）→ total=4, completed=3, rate=75", () => {
    const cycles = [
      { phase: "P 计划", completed: true },
      { phase: "D 执行", completed: true },
      { phase: "C 检查", completed: true },
      { phase: "A 处理", completed: false },
    ];
    const result = aggregatePdcaCycle(cycles);
    expect(result.total).toBe(4);
    expect(result.completed).toBe(3);
    expect(result.rate).toBe(75);
  });
});

describe("aggregatePdcaCycle 空", () => {
  // 手算：空 → total=0, completed=0, rate=0
  it("空 → total=0, completed=0, rate=0", () => {
    const cycles: { phase: string; completed: boolean }[] = [];
    const result = aggregatePdcaCycle(cycles);
    expect(result.total).toBe(0);
    expect(result.completed).toBe(0);
    expect(result.rate).toBe(0);
  });
});

describe("buildPdcaReport 降低缺陷率", () => {
  // 手算：plan='降低缺陷率', do='系统拦截', check='数据监控', act='流程优化' → 正确构建
  it("plan='降低缺陷率', do='系统拦截', check='数据监控', act='流程优化' → 正确构建", () => {
    const report: PdcaReportV14 = buildPdcaReport("降低缺陷率", "系统拦截", "数据监控", "流程优化");
    expect(report.plan).toBe("降低缺陷率");
    expect(report.do).toBe("系统拦截");
    expect(report.check).toBe("数据监控");
    expect(report.act).toBe("流程优化");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-pdca-report auth:true", () => {
    const def = (emrQcPdcaReportV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-pdca-report");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
