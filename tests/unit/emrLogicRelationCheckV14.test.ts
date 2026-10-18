/**
 * 健澜科技 jlmedaios - 病历逻辑关系检查 V14 单测（M485-B）
 *
 * 测试 checkLogicRelation 检查、buildLogicReport 报告、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  checkLogicRelation,
  buildLogicReport,
  type LogicRelationResultV14,
} from "../../src/bff/aggregators/emrLogicRelationCheckV14Aggregator";
import { emrLogicRelationCheckV14Routes } from "../../src/bff/routes/emrLogicRelationCheckV14";
import type { RouteDef } from "../../src/bff/types";

describe("checkLogicRelation 糖尿病+降压药", () => {
  // 手算：诊断"糖尿病"+用药"降压药" → conflicts 非空
  it("诊断糖尿病+用药降压药 → conflicts 非空", () => {
    const result: LogicRelationResultV14 = checkLogicRelation({ diagnosis: "糖尿病", medication: "降压药", procedure: "" });
    expect(result.conflicts.length).toBeGreaterThan(0);
  });
});

describe("checkLogicRelation 高血压+降压药", () => {
  // 手算：诊断"高血压"+用药"降压药" → conflicts=[]
  it("诊断高血压+用药降压药 → conflicts=[]", () => {
    const result: LogicRelationResultV14 = checkLogicRelation({ diagnosis: "高血压", medication: "降压药", procedure: "" });
    expect(result.conflicts.length).toBe(0);
  });
});

describe("buildLogicReport 2冲突", () => {
  // 手算：conflictCount=2 → 100-2×10=80
  it("conflictCount=2 → score=80", () => {
    const result: LogicRelationResultV14 = { diagnosis: "test", medication: "test", procedure: "test", conflicts: ["冲突1", "冲突2"] };
    const report = buildLogicReport(result);
    expect(report.score).toBe(80);
  });
});

describe("buildLogicReport 0冲突", () => {
  // 手算：conflictCount=0 → 100-0×10=100
  it("conflictCount=0 → score=100", () => {
    const result: LogicRelationResultV14 = { diagnosis: "test", medication: "test", procedure: "test", conflicts: [] };
    const report = buildLogicReport(result);
    expect(report.score).toBe(100);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-logic-relation-check auth:true", () => {
    const def = (emrLogicRelationCheckV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-logic-relation-check");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
