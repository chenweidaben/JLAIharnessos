/**
 * 健澜科技 jlmedaios - 病历质控知识库 V14 单测（M475-D，M475 收官）
 *
 * 测试 QC_KB_ENTRIES_V14 条目数、searchQcKnowledge 搜索、buildKnowledgeEntry 创建、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  QC_KB_ENTRIES_V14,
  searchQcKnowledge,
  buildKnowledgeEntry,
  type KnowledgeEntryV14,
} from "../../src/knowledge/emr/qcKnowledgeBaseV14";
import { emrQcKnowledgeV14Routes } from "../../src/bff/routes/emrQcKnowledgeV14";
import type { RouteDef } from "../../src/bff/types";

describe("QC_KB_ENTRIES_V14 条目数", () => {
  // 手算：5 条质控知识条目（书写规范/缺陷类型/整改措施/评分标准/法律法规）
  it("条目数≥5", () => {
    expect(QC_KB_ENTRIES_V14.length).toBeGreaterThanOrEqual(5);
  });
});

describe("searchQcKnowledge 书写", () => {
  // 手算：keyword='书写' → title includes '书写' → 返回含"书写"标题的条目（非空）
  it("searchQcKnowledge('书写') → 返回含'书写'标题的条目（非空）", () => {
    const results = searchQcKnowledge("书写");
    expect(results.length).toBeGreaterThan(0);
  });
});

describe("searchQcKnowledge 无匹配", () => {
  // 手算：keyword='不存在的关键词xyz' → 返回空数组 []
  it("searchQcKnowledge('不存在的关键词xyz') → 返回空数组", () => {
    expect(searchQcKnowledge("不存在的关键词xyz")).toEqual([]);
  });
});

describe("buildKnowledgeEntry 创建", () => {
  // 手算：id=K001, category='评分标准', title='百分制计分规则' → 正确创建
  it("id=K001, category='评分标准', title='百分制计分规则' → 正确创建", () => {
    const entry: KnowledgeEntryV14 = buildKnowledgeEntry("K001", "评分标准", "百分制计分规则", "基础分100分");
    expect(entry.id).toBe("K001");
    expect(entry.category).toBe("评分标准");
    expect(entry.title).toBe("百分制计分规则");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-knowledge auth:true", () => {
    const def = (emrQcKnowledgeV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-knowledge");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
