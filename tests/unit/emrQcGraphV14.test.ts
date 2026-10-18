/**
 * 健澜科技 jlmedaios - 病历质控知识图谱 V14 单测（M465-D）
 *
 * 测试 QC_GRAPH_V14 节点数≥4、findRelatedDefects 主诉缺失→非空、未知类型→空数组、getRemediationAdvice 时限超时→非空、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  findRelatedDefects,
  getRemediationAdvice,
  QC_GRAPH_V14,
} from "../../src/bff/aggregators/emrQcGraphV14Aggregator";
import { emrQcGraphV14Routes } from "../../src/bff/routes/emrQcGraphV14";
import type { RouteDef } from "../../src/bff/types";

describe("QC_GRAPH_V14 节点数", () => {
  // 手算：内置 4 个节点（主诉缺失/现病史过短/诊断不规范/时限超时）→ 节点数≥4
  it("节点数≥4", () => {
    expect(QC_GRAPH_V14.length).toBeGreaterThanOrEqual(4);
  });
});

describe("findRelatedDefects 主诉缺失", () => {
  // 手算："主诉缺失" 的 relatedDefects = ["现病史过短"] → 非空数组
  it("'主诉缺失' → 返回非空数组", () => {
    const related = findRelatedDefects("主诉缺失");
    expect(related.length).toBeGreaterThan(0);
  });
});

describe("findRelatedDefects 未知类型", () => {
  // 手算："未知类型xyz" 不在节点中 → 返回空数组 []
  it("'未知类型' → 返回空数组", () => {
    const related = findRelatedDefects("未知类型xyz");
    expect(related).toEqual([]);
  });
});

describe("getRemediationAdvice 时限超时", () => {
  // 手算："时限超时" 的 remedies 至少 1 条 → 非空整改措施
  it("'时限超时' → 返回非空整改措施", () => {
    const remedies = getRemediationAdvice("时限超时");
    expect(remedies.length).toBeGreaterThan(0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-graph auth:true", () => {
    const def = (emrQcGraphV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-graph");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
