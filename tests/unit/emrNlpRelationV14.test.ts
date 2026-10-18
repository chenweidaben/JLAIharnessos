/**
 * 健澜科技 jlmedaios - NLP 病历关系抽取 V14 单测（M490-B）
 *
 * 测试 extractMedicalRelations 提取、buildRelationReport 构建、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  extractMedicalRelations,
  buildRelationReport,
  type NlpRelationResultV14,
} from "../../src/bff/aggregators/emrNlpRelationV14Aggregator";
import { emrNlpRelationV14Routes } from "../../src/bff/routes/emrNlpRelationV14";
import type { RouteDef } from "../../src/bff/types";

describe("extractMedicalRelations 胰岛素治疗糖尿病", () => {
  // 手算：含"胰岛素治疗糖尿病" → relations 非空
  it("含'胰岛素治疗糖尿病' → relations 非空", () => {
    const result = extractMedicalRelations("胰岛素治疗糖尿病");
    expect(result.relations.length).toBeGreaterThan(0);
  });
});

describe("extractMedicalRelations 空内容", () => {
  // 手算：空内容 → relations=[]
  it("空内容 → relations=[]", () => {
    const result = extractMedicalRelations("");
    expect(result.relations).toEqual([]);
  });
});

describe("buildRelationReport 3个关系", () => {
  // 手算：relations=['治疗','导致','禁忌'] → relationCount=3
  it("relations=['治疗','导致','禁忌'] → relationCount=3", () => {
    const result: NlpRelationResultV14 = { relations: ["治疗", "导致", "禁忌"] };
    const report = buildRelationReport(result);
    expect(report.relationCount).toBe(3);
  });
});

describe("buildRelationReport 空关系", () => {
  // 手算：relations=[] → relationCount=0
  it("relations=[] → relationCount=0", () => {
    const result: NlpRelationResultV14 = { relations: [] };
    const report = buildRelationReport(result);
    expect(report.relationCount).toBe(0);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-nlp-relation auth:true", () => {
    const def = (emrNlpRelationV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-nlp-relation");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
