/**
 * 健澜科技 jlmedaios - 质控制度查询 V14 单测（M505-B）
 *
 * 测试 searchPolicy 搜索、buildPolicyReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPolicyReport,
  searchPolicy,
  type PolicyItemV14,
} from "../../src/bff/aggregators/emrQcPolicyQueryV14Aggregator";
import { emrQcPolicyQueryV14Routes } from "../../src/bff/routes/emrQcPolicyQueryV14";
import type { RouteDef } from "../../src/bff/types";

const samplePolicies: PolicyItemV14[] = [
  { title: "病历管理制度", content: "内容A" },
  { title: "质控工作制度", content: "内容B" },
  { title: "考核制度", content: "内容C" },
];

describe("searchPolicy 病历", () => {
  // 手算：3 条制度，keyword='病历' → title 包含'病历'的只有 1 条（病历管理制度）
  it("keyword='病历' → 返回 1 条", () => {
    const results = searchPolicy(samplePolicies, "病历");
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("病历管理制度");
  });
});

describe("searchPolicy 制度", () => {
  // 手算：3 条制度，keyword='制度' → 所有 title 都包含'制度'，返回 3 条
  it("keyword='制度' → 返回 3 条", () => {
    const results = searchPolicy(samplePolicies, "制度");
    expect(results.length).toBe(3);
  });
});

describe("searchPolicy 空数组", () => {
  // 手算：空数组 → 返回空数组
  it("空数组 → 返回空数组", () => {
    const results: PolicyItemV14[] = [];
    expect(searchPolicy(results, "病历").length).toBe(0);
  });
});

describe("buildPolicyReport 两条结果", () => {
  // 手算：2 条结果 → resultCount=2（数组长度）
  it("2 条结果 → resultCount=2", () => {
    const results: PolicyItemV14[] = [
      { title: "病历管理制度", content: "内容A" },
      { title: "质控工作制度", content: "内容B" },
    ];
    const report = buildPolicyReport(results);
    expect(report.resultCount).toBe(2);
    expect(report.results.length).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-policy-query auth:true", () => {
    const def = (emrQcPolicyQueryV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-policy-query");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
