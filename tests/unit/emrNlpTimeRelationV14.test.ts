/**
 * 健澜科技 jlmedaios - 病历 NLP 时间关系提取 V14 单测（M531-C）
 *
 * 测试 buildNlpTimeRelation 构建提取、extractTimeRelation 时间关系提取、buildNlpTimeRelationReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildNlpTimeRelation,
  buildNlpTimeRelationReport,
  extractTimeRelation,
  type NlpTimeRelationInputV14,
} from "../../src/bff/aggregators/emrNlpTimeRelationV14Aggregator";
import { emrNlpTimeRelationV14Routes } from "../../src/bff/routes/emrNlpTimeRelationV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildNlpTimeRelation 构建提取", () => {
  // 手算：recordId='REC080', dept='心内科' → 正确构建
  it("recordId='REC080', dept='心内科' → 正确构建", () => {
    const nlp = buildNlpTimeRelation("REC080", "心内科");
    expect(nlp.recordId).toBe("REC080");
    expect(nlp.dept).toBe("心内科");
  });
});

describe("extractTimeRelation 之前", () => {
  // 手算：{eventA='入院', eventB='手术', relationType='之前'}
  // 手算：relation = relationType = '之前'
  // 手算：daysDiff = relationType === '同时' ? 0 : 1 = 1
  it("{eventA='入院', eventB='手术', relationType='之前'} → relation='之前', daysDiff=1", () => {
    const input: NlpTimeRelationInputV14 = { eventA: "入院", eventB: "手术", relationType: "之前" };
    const result = extractTimeRelation(input);
    expect(result.relation).toBe("之前");
    expect(result.daysDiff).toBe(1);
  });
});

describe("extractTimeRelation 同时", () => {
  // 手算：{eventA='胸痛发作', eventB='心电图异常', relationType='同时'}
  // 手算：relation = relationType = '同时'
  // 手算：daysDiff = relationType === '同时' ? 0 : 1 = 0
  it("{eventA='胸痛发作', eventB='心电图异常', relationType='同时'} → relation='同时', daysDiff=0", () => {
    const input: NlpTimeRelationInputV14 = { eventA: "胸痛发作", eventB: "心电图异常", relationType: "同时" };
    const result = extractTimeRelation(input);
    expect(result.relation).toBe("同时");
    expect(result.daysDiff).toBe(0);
  });
});

describe("buildNlpTimeRelationReport 构建报告", () => {
  // 手算：{relation:'之前', daysDiff:1}
  // 手算：透传 relation + daysDiff
  it("{relation:'之前', daysDiff:1} → 正确返回（透传）", () => {
    const report = buildNlpTimeRelationReport({ relation: "之前", daysDiff: 1 });
    expect(report.relation).toBe("之前");
    expect(report.daysDiff).toBe(1);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-nlp-time-relation auth:true", () => {
    const def = (emrNlpTimeRelationV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-nlp-time-relation");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
