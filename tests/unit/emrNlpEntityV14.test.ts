/**
 * 健澜科技 jlmedaios - NLP 病历实体识别 V14 单测（M490-A）
 *
 * 测试 extractMedicalEntities 提取、buildEntityReport 构建、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  extractMedicalEntities,
  buildEntityReport,
  type NlpEntityResultV14,
} from "../../src/bff/aggregators/emrNlpEntityV14Aggregator";
import { emrNlpEntityV14Routes } from "../../src/bff/routes/emrNlpEntityV14";
import type { RouteDef } from "../../src/bff/types";

describe("extractMedicalEntities 糖尿病头痛", () => {
  // 手算：含"糖尿病头痛" → entities 非空
  it("含'糖尿病头痛' → entities 非空", () => {
    const result = extractMedicalEntities("患者糖尿病病史5年，近期头痛");
    expect(result.entities.length).toBeGreaterThan(0);
  });
});

describe("extractMedicalEntities 空内容", () => {
  // 手算：空内容 → entities=[]
  it("空内容 → entities=[]", () => {
    const result = extractMedicalEntities("");
    expect(result.entities).toEqual([]);
  });
});

describe("buildEntityReport 3个实体", () => {
  // 手算：entities=['糖尿病','头痛','胰岛素'] → entityCount=3
  it("entities=['糖尿病','头痛','胰岛素'] → entityCount=3", () => {
    const result: NlpEntityResultV14 = { entities: ["糖尿病", "头痛", "胰岛素"] };
    const report = buildEntityReport(result);
    expect(report.entityCount).toBe(3);
  });
});

describe("buildEntityReport 空实体", () => {
  // 手算：entities=[] → entityCount=0
  it("entities=[] → entityCount=0", () => {
    const result: NlpEntityResultV14 = { entities: [] };
    const report = buildEntityReport(result);
    expect(report.entityCount).toBe(0);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-nlp-entity auth:true", () => {
    const def = (emrNlpEntityV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-nlp-entity");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
