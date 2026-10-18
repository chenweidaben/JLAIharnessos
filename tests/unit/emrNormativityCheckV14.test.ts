/**
 * 健澜科技 jlmedaios - 病历规范性检查 V14 单测（M476-D，M476 收官）
 *
 * 测试 findNormativityIssues 模糊用语识别、checkNormativity 检查结论、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  checkNormativity,
  findNormativityIssues,
  type NormativityResultV14,
} from "../../src/bff/aggregators/emrNormativityCheckV14Aggregator";
import { emrNormativityCheckV14Routes } from "../../src/bff/routes/emrNormativityCheckV14";
import type { RouteDef } from "../../src/bff/types";

describe("findNormativityIssues 模糊用语", () => {
  // 手算：含"大概""可能"两个模糊词 → 返回非空问题列表
  it("含'大概''可能'等模糊用语 → 返回非空问题列表", () => {
    const content = "患者大概于 3 天前出现发热，可能为上呼吸道感染。";
    const issues = findNormativityIssues(content);
    expect(issues.length).toBeGreaterThan(0);
  });
});

describe("findNormativityIssues 规范书写", () => {
  // 手算：无模糊词 → 返回空数组 []
  it("规范书写（无模糊词）→ 返回空数组", () => {
    const content = "患者 3 天前出现发热，体温 38.5℃，诊断为上呼吸道感染。";
    expect(findNormativityIssues(content)).toEqual([]);
  });
});

describe("checkNormativity 有问题", () => {
  // 手算：含模糊词 → issueCount>0, passed=false
  it("有问题 → issueCount>0, passed=false", () => {
    const content = "患者大概于 3 天前出现发热。";
    const result: NormativityResultV14 = checkNormativity(content);
    expect(result.issueCount).toBeGreaterThan(0);
    expect(result.passed).toBe(false);
  });
});

describe("checkNormativity 全规范", () => {
  // 手算：无模糊词 → issueCount=0, passed=true
  it("全规范 → issueCount=0, passed=true", () => {
    const content = "患者 3 天前出现发热，体温 38.5℃。";
    const result: NormativityResultV14 = checkNormativity(content);
    expect(result.issueCount).toBe(0);
    expect(result.passed).toBe(true);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-normativity-check auth:true", () => {
    const def = (emrNormativityCheckV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-normativity-check");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
