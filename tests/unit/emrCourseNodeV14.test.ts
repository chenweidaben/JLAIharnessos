/**
 * 健澜科技 jlmedaios - 病程关键节点标记 V14 单测（M538-B）
 *
 * 测试 buildCourseNode 构建关键节点、markCourseNode 节点标记、buildCourseNodeReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildCourseNode,
  buildCourseNodeReport,
  markCourseNode,
  type CourseNodeInputV14,
} from "../../src/bff/aggregators/emrCourseNodeV14Aggregator";
import { emrCourseNodeV14Routes } from "../../src/bff/routes/emrCourseNodeV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildCourseNode 构建关键节点", () => {
  // 手算：recordId='REC501', dept='普外科' → 正确构建
  it("recordId='REC501', dept='普外科' → 正确构建", () => {
    const node = buildCourseNode("REC501", "普外科");
    expect(node.recordId).toBe("REC501");
    expect(node.dept).toBe("普外科");
  });
});

describe("markCourseNode 手术", () => {
  // 手算：{nodeType='手术', day=3}
  // 手算：marked = true
  // 手算：nodeLabel = 3 + '天·' + '手术' = '3天·手术'
  it("{nodeType='手术', day=3} → marked=true, nodeLabel='3天·手术'", () => {
    const input: CourseNodeInputV14 = { nodeType: "手术", day: 3 };
    const result = markCourseNode(input);
    expect(result.marked).toBe(true);
    expect(result.nodeLabel).toBe("3天·手术");
  });
});

describe("markCourseNode 出院", () => {
  // 手算：{nodeType='出院', day=10}
  // 手算：marked = true
  // 手算：nodeLabel = 10 + '天·' + '出院' = '10天·出院'
  it("{nodeType='出院', day=10} → marked=true, nodeLabel='10天·出院'", () => {
    const input: CourseNodeInputV14 = { nodeType: "出院", day: 10 };
    const result = markCourseNode(input);
    expect(result.marked).toBe(true);
    expect(result.nodeLabel).toBe("10天·出院");
  });
});

describe("buildCourseNodeReport 构建报告", () => {
  // 手算：{marked=true, nodeLabel='3天·手术'}
  // 手算：透传 marked + nodeLabel
  it("{marked=true, nodeLabel='3天·手术'} → 正确返回（透传）", () => {
    const report = buildCourseNodeReport({ marked: true, nodeLabel: "3天·手术" });
    expect(report.marked).toBe(true);
    expect(report.nodeLabel).toBe("3天·手术");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-course-node auth:true", () => {
    const def = (emrCourseNodeV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-course-node");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
